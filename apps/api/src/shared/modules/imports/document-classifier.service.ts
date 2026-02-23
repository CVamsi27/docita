import { Injectable, Logger } from '@nestjs/common';

/**
 * DocumentClassifierService - Detects document type from extracted text
 * Responsibilities:
 * - Document type classification (Prescription, Lab Report, Case Sheet, General)
 * - Text analysis and pattern matching
 * - Keyword-based classification
 */
@Injectable()
export class DocumentClassifierService {
  private readonly logger = new Logger(DocumentClassifierService.name);

  /**
   * Detect document type from extracted text
   */
  detectDocumentType(
    text: string,
  ): 'PRESCRIPTION' | 'CASE_SHEET' | 'LAB_REPORT' | 'GENERAL' {
    const lowerText = text.toLowerCase();

    // Prescription indicators
    if (
      lowerText.includes('rx') ||
      lowerText.includes('prescription') ||
      lowerText.includes('medication') ||
      lowerText.includes('dosage') ||
      lowerText.includes('take') ||
      lowerText.includes('tablet') ||
      lowerText.includes('capsule')
    ) {
      this.logger.debug('[OCR] Classified as PRESCRIPTION');
      return 'PRESCRIPTION';
    }

    // Lab report indicators
    if (
      lowerText.includes('lab') ||
      lowerText.includes('result') ||
      lowerText.includes('test') ||
      lowerText.includes('hemoglobin') ||
      lowerText.includes('glucose') ||
      lowerText.includes('creatinine') ||
      lowerText.includes('value') ||
      lowerText.includes('reference')
    ) {
      this.logger.debug('[OCR] Classified as LAB_REPORT');
      return 'LAB_REPORT';
    }

    // Case sheet indicators
    if (
      lowerText.includes('case sheet') ||
      lowerText.includes('diagnosis') ||
      lowerText.includes('chief complaint') ||
      lowerText.includes('history') ||
      lowerText.includes('examination') ||
      lowerText.includes('patient')
    ) {
      this.logger.debug('[OCR] Classified as CASE_SHEET');
      return 'CASE_SHEET';
    }

    this.logger.debug('[OCR] Classified as GENERAL');
    return 'GENERAL';
  }
}
