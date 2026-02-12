import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ExtractedText, ParsedMedicalFields } from '@workspace/types';
import { ImagePreprocessorService } from './image-preprocessor.service';
import { TextExtractorService } from './text-extractor.service';
import { DocumentClassifierService } from './document-classifier.service';
import { TextParserService } from './text-parser.service';
import { ConfidenceScorerService } from './confidence-scorer.service';

/**
 * OCRFacadeService - Main facade for OCR functionality
 * Responsibilities:
 * - Orchestrate all OCR specialized services
 * - Maintain public API identical to original OCRService
 * - Provide high-level OCR operations: extract, parse, classify
 */
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

  /**
   * Preprocess image for better OCR accuracy
   * Delegates to ImagePreprocessorService
   */
  async preprocessImage(imagePath: string): Promise<Buffer> {
    return this.imagePreprocessor.preprocessImage(imagePath);
  }

  /**
   * Extract text from medical document using OCR
   * Orchestrates: file validation → preprocessing → text extraction
   */
  async extractTextFromImage(imagePath: string): Promise<ExtractedText> {
    try {
      // Check if OCR is available
      if (!this.textExtractor.isAvailable()) {
        this.logger.warn(
          '[OCR] Tesseract.js not available in this build. Using fallback extraction.',
        );
        return {
          text: '',
          confidence: 0.05,
          documentType: 'GENERAL',
        };
      }

      // Verify the file exists and is readable
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

      // Preprocess image for better accuracy
      const processedBuffer =
        await this.imagePreprocessor.preprocessImage(imagePath);
      this.logger.log(
        `[OCR] Image preprocessed, buffer size: ${processedBuffer.length} bytes`,
      );

      // Extract text using Tesseract
      const extractedText =
        await this.textExtractor.extractTextFromBuffer(processedBuffer);

      // Classify document type
      const documentType =
        this.documentClassifier.detectDocumentType(extractedText);

      // Calculate confidence
      // Average of text length factor and extraction success
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

  /**
   * Detect document type from extracted text
   * Delegates to DocumentClassifierService
   */
  detectDocumentType(
    text: string,
  ): 'PRESCRIPTION' | 'CASE_SHEET' | 'LAB_REPORT' | 'GENERAL' {
    return this.documentClassifier.detectDocumentType(text);
  }

  /**
   * Parse extracted text into structured medical fields
   * Delegates to TextParserService
   */
  parseExtractedText(text: string): ParsedMedicalFields {
    return this.textParser.parseExtractedText(text);
  }

  /**
   * Generate confidence scores for extracted fields
   * Delegates to ConfidenceScorerService
   */
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
