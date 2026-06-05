import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { OpenaiService } from './openai.service';
import {
  OcrExtractedFields,
  OcrExtractionResult,
  FieldConfidenceConfig,
} from '@workspace/types';
import { coerceOcrRawData } from '@/shared/modules/ai/ocr-raw-data.boundary';
import { isRecord, parseStringEnumMember } from '@workspace/utils';
import * as fs from 'fs';
import sharp from 'sharp';
import {
  normalizeOcrFields,
  calculateOverallConfidence,
} from './ocr-field-normalizer';
import { basicOcrParsing } from './ocr-basic-parser';

const OCR_DOCUMENT_TYPES = [
  'PRESCRIPTION',
  'CASE_SHEET',
  'LAB_REPORT',
  'GENERAL',
] as const;

@Injectable()
export class OcrExtractionService {
  private readonly logger = new Logger(OcrExtractionService.name);

  constructor(private openaiService: OpenaiService) {}

  async extractFromMedicalDocument(
    imagePath: string,
    hasAiSubscription: boolean = false,
  ): Promise<OcrExtractionResult> {
    const startTime = Date.now();

    try {
      const rawText = await this.extractTextFromImage(imagePath);
      const extractedFields = await this.parseOcrText(
        rawText,
        hasAiSubscription,
      );
      const documentType = hasAiSubscription
        ? await this.detectDocumentType(rawText)
        : 'GENERAL';
      const suggestedCorrectionsRaw = hasAiSubscription
        ? await this.generateFieldSuggestions(extractedFields)
        : undefined;
      const suggestedCorrections = isRecord(suggestedCorrectionsRaw)
        ? suggestedCorrectionsRaw
        : undefined;
      const confidence = calculateOverallConfidence(
        extractedFields.fieldConfidence,
      );

      const duration = Date.now() - startTime;
      this.logger.log(`OCR extraction completed in ${duration}ms`);

      return {
        text: rawText,
        documentType: documentType,
        confidence,
        fields: extractedFields,
        suggestedCorrections,
      };
    } catch (error) {
      this.logger.error(
        `OCR extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  private async extractTextFromImage(imagePath: string): Promise<string> {
    if (!this.openaiService.client)
      throw new ServiceUnavailableException('OpenAI Vision API not configured');

    const imageData = await this.prepareImageForVision(imagePath);
    const base64Image = imageData.toString('base64');
    const content: Array<
      | { type: 'image_url'; image_url: { url: string } }
      | { type: 'text'; text: string }
    > = [
      {
        type: 'image_url',
        image_url: { url: `data:image/jpeg;base64,${base64Image}` },
      },
      {
        type: 'text',
        text: `Extract ALL text from this medical document. Demographics, Vitals, Lab values, Medications, Diagnosis, Symptoms, Dates, Doctor info, Billing details. Return ONLY the text.`,
      },
    ];

    const response = await this.openaiService.client.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content,
        },
      ],
      max_tokens: 4000,
    });

    return response.choices[0]?.message?.content || '';
  }

  private async prepareImageForVision(imagePath: string): Promise<Buffer> {
    try {
      return await sharp(imagePath)
        .rotate()
        .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer();
    } catch (error) {
      this.logger.warn(
        `Falling back to original OCR image: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return fs.readFileSync(imagePath);
    }
  }

  private async parseOcrText(
    ocrText: string,
    hasAiSubscription: boolean,
  ): Promise<OcrExtractedFields> {
    const config: FieldConfidenceConfig = {
      medicalFields: 0.85,
      contactFields: 0.7,
      vitalFields: 0.8,
    };

    if (!this.openaiService.client || !hasAiSubscription) {
      return basicOcrParsing(ocrText, config);
    }

    return this.openaiService
      .callChatCompletion({
        systemPrompt:
          'You are a medical document parser. Extract structured data into JSON.',
        userPrompt: `Extract from this OCR text:\n${ocrText}`,
      })
      .then((parsed) => normalizeOcrFields(coerceOcrRawData(parsed), config))
      .catch(() => basicOcrParsing(ocrText, config));
  }

  private async detectDocumentType(
    ocrText: string,
  ): Promise<(typeof OCR_DOCUMENT_TYPES)[number]> {
    const raw = await this.openaiService.callChatCompletion({
      systemPrompt:
        'Classify document type: PRESCRIPTION, CASE_SHEET, LAB_REPORT, or GENERAL. Return one word.',
      userPrompt: ocrText.substring(0, 500),
      jsonMode: false,
    });
    const token =
      typeof raw === 'string' ? raw.trim().toUpperCase() : 'GENERAL';
    return parseStringEnumMember(OCR_DOCUMENT_TYPES, token) ?? 'GENERAL';
  }

  private async generateFieldSuggestions(fields: OcrExtractedFields) {
    const lowConfidenceFields = Object.entries(fields.fieldConfidence)
      .filter(([_, conf]) => conf < 0.75)
      .map(([f]) => f);

    if (lowConfidenceFields.length === 0) return {};

    return this.openaiService.callChatCompletion({
      systemPrompt:
        'Suggest corrections for low-confidence fields. Return JSON.',
      userPrompt: `Fields: ${lowConfidenceFields.join(', ')}\nData: ${JSON.stringify(fields)}`,
    });
  }
}
