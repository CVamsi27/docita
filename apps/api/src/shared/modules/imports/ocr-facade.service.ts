import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ExtractedText, ParsedMedicalFields } from '@workspace/types';
import { ImagePreprocessorService } from './image-preprocessor.service';
import { TextExtractorService } from './text-extractor.service';
import { DocumentClassifierService } from './document-classifier.service';
import { TextParserService } from './text-parser.service';
import { ConfidenceScorerService } from './confidence-scorer.service';

@Injectable()
export class OCRFacadeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OCRFacadeService.name);

  constructor(
    private imagePreprocessor: ImagePreprocessorService,
    private textExtractor: TextExtractorService,
    private documentClassifier: DocumentClassifierService,
    private textParser: TextParserService,
    private confidenceScorer: ConfidenceScorerService,
  ) {}

  async onModuleInit() {
    await this.textExtractor.initialize();
  }

  async onModuleDestroy() {
    await this.textExtractor.cleanup();
  }

  async preprocessImage(imagePath: string): Promise<Buffer> {
    return this.imagePreprocessor.preprocessImage(imagePath);
  }

  async extractTextFromImage(imagePath: string): Promise<ExtractedText> {
    try {
      if (!this.textExtractor.isAvailable()) {
        await this.textExtractor.initialize();
      }

      if (!this.textExtractor.isAvailable()) {
        this.logger.warn(
          '[OCR] Tesseract not available. Using fallback extraction.',
        );
        return { text: '', confidence: 0.05, documentType: 'GENERAL' };
      }

      const fileExists =
        await this.imagePreprocessor.verifyImageFileExists(imagePath);
      if (!fileExists) {
        this.logger.error(`[OCR] File not found or unreadable: ${imagePath}`);
        return {
          text: '',
          confidence: 0.1,
          documentType: 'GENERAL',
        };
      }

      const processedBuffer =
        await this.imagePreprocessor.preprocessImage(imagePath);
      this.logger.log(
        `[OCR] Image preprocessed, buffer size: ${processedBuffer.length} bytes`,
      );

      const extractedText =
        await this.textExtractor.extractTextFromBuffer(processedBuffer);

      const documentType =
        this.documentClassifier.detectDocumentType(extractedText);

      const confidence =
        extractedText.length > 50 ? 0.8 : extractedText.length > 10 ? 0.5 : 0.2;

      this.logger.log(
        `[OCR] Successfully extracted ${extractedText.length} characters, classified as ${documentType}`,
      );

      return {
        text: extractedText,
        confidence,
        documentType,
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`[OCR] Failed to extract text: ${err.message}`);
      throw error;
    }
  }

  detectDocumentType(
    text: string,
  ): 'PRESCRIPTION' | 'CASE_SHEET' | 'LAB_REPORT' | 'GENERAL' {
    return this.documentClassifier.detectDocumentType(text);
  }

  parseExtractedText(text: string): ParsedMedicalFields {
    return this.textParser.parseExtractedText(text);
  }

  generateConfidenceScores(
    extractedText: string,
    fields: ParsedMedicalFields,
  ): Record<string, number> {
    return this.confidenceScorer.generateConfidenceScores(
      extractedText,
      fields,
    );
  }
}
