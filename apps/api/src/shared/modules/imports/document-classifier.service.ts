import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DocumentClassifierService {
  private readonly logger = new Logger(DocumentClassifierService.name);

  detectDocumentType(
    text: string,
  ): 'PRESCRIPTION' | 'CASE_SHEET' | 'LAB_REPORT' | 'GENERAL' {
    const lowerText = text.toLowerCase();

    if (
      lowerText.includes('rx') ||
      lowerText.includes('prescription') ||
      lowerText.includes('medication') ||
      lowerText.includes('dosage') ||
      lowerText.includes('take') ||
      lowerText.includes('tablet') ||
      lowerText.includes('capsule')
    ) {
      this.logger.debug('[OCR] Classified: PRESCRIPTION');
      return 'PRESCRIPTION';
    }

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
      this.logger.debug('[OCR] Classified: LAB_REPORT');
      return 'LAB_REPORT';
    }

    if (
      lowerText.includes('case sheet') ||
      lowerText.includes('diagnosis') ||
      lowerText.includes('chief complaint') ||
      lowerText.includes('history') ||
      lowerText.includes('examination') ||
      lowerText.includes('patient')
    ) {
      this.logger.debug('[OCR] Classified: CASE_SHEET');
      return 'CASE_SHEET';
    }

    this.logger.debug('[OCR] Classified: GENERAL');
    return 'GENERAL';
  }
}
