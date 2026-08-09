import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { unlink } from 'fs/promises';
import { PrismaService } from '@/prisma/prisma.service';
import { Feature } from '@workspace/types';
import { ApplicationEvents } from '@/shared/common/events/application-events';
import { clinicHasFeatureForAccess } from '@/shared/modules/auth/utils/clinic-feature-access.util';
import { AIService } from '@/shared/modules/ai/ai.service';
import { OCRService } from './ocr.service';

interface OcrExtractionResult {
  success: boolean;
  method: string;
  text: string;
  documentType: string;
  confidence: number;
  fields: Record<string, unknown> & {
    fieldConfidence: Record<string, number>;
  };
  suggestedCorrections: Record<string, unknown>;
  message: string;
}

@Injectable()
export class ImportOcrWorkflowService {
  private readonly logger = new Logger(ImportOcrWorkflowService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ocrService: OCRService,
    private readonly eventEmitter: EventEmitter2,
    private readonly aiService: AIService,
  ) {}

  async processMedicalDocumentOcr(
    filePath: string,
    clinicId?: string,
  ): Promise<OcrExtractionResult> {
    let useAi = false;
    if (clinicId) {
      const clinic = await this.prisma.clinic.findUnique({
        where: { id: clinicId },
        select: {
          tier: true,
          intelligenceAddon: true,
          features: true,
        },
      });
      if (clinic) {
        useAi = clinicHasFeatureForAccess(clinic, Feature.OCR_ADVANCED);
      }
    }

    if (useAi) {
      try {
        const ai = await this.aiService.extractFromMedicalDocument(
          filePath,
          true,
        );
        await unlink(filePath).catch(() => {});
        if (clinicId) {
          this.eventEmitter.emit(ApplicationEvents.OCR_PAGE_PROCESSED, {
            clinicId,
            pageCount: 1,
          });
        }
        const fieldConfidence = ai.fields.fieldConfidence ?? {};
        return {
          success: true,
          method: 'openai-vision',
          text: ai.text,
          documentType: ai.documentType,
          confidence: ai.confidence,
          fields: {
            ...ai.fields,
            fieldConfidence,
          },
          suggestedCorrections: ai.suggestedCorrections ?? {},
          message:
            'Document processed with AI-assisted extraction. Verify all fields before saving patient data.',
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `[IMPORT] AI OCR unavailable, falling back to basic pipeline: ${msg}`,
        );
      }
    }

    return this.extractFromMedicalDocumentBasic(filePath, clinicId);
  }

  async extractFromMedicalDocumentBasic(
    filePath: string,
    clinicId?: string,
  ): Promise<OcrExtractionResult> {
    this.logger.log(`[IMPORT] Starting OCR extraction for file: ${filePath}`);
    try {
      const ocrResult = await this.ocrService.extractTextFromImage(filePath);
      if (clinicId) {
        this.eventEmitter.emit(ApplicationEvents.OCR_PAGE_PROCESSED, {
          clinicId,
          pageCount: 1,
        });
      }
      this.logger.log(
        `[IMPORT] OCR extraction complete - confidence: ${ocrResult.confidence.toFixed(2)}, text length: ${ocrResult.text.length}`,
      );

      const fields = this.ocrService.parseExtractedText(ocrResult.text);

      const fieldConfidence = this.ocrService.generateConfidenceScores(
        ocrResult.text,
        fields,
      );

      await unlink(filePath).catch(() => {});

      const message =
        ocrResult.confidence > 0.3
          ? 'Document scanned using Tesseract OCR with image preprocessing'
          : 'Unable to extract text from image. Please manually enter or verify highlighted fields below.';

      this.logger.log(
        `[IMPORT] Returning response with ${Object.keys(fieldConfidence).length} fields`,
      );

      return {
        success: true,
        method: 'tesseract-ocr',
        text: ocrResult.text,
        documentType: ocrResult.documentType,
        confidence: ocrResult.confidence,
        fields: {
          ...fields,
          fieldConfidence,
        },
        suggestedCorrections: {},
        message,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`[IMPORT] OCR extraction failed: ${message}`, stack);
      await unlink(filePath).catch(() => {});
      throw new BadRequestException(`Failed to process image: ${message}`);
    }
  }
}
