/**
 * OCR Service Interface
 *
 * Defines the contract for optical character recognition.
 * Supports multiple OCR providers (Tesseract, AWS Textract, Google Vision, etc.)
 *
 * @interface IOcrService
 */
export interface IOcrService {
  /**
   * Extract text from an image
   * @param imagePath - Path to image file
   * @param language - Language for OCR (e.g., 'eng', 'hin+eng')
   * @returns Promise with extracted text
   */
  extractText(
    imagePath: string,
    language?: string,
  ): Promise<{
    text: string;
    confidence: number;
    language: string;
  }>;

  /**
   * Extract structured data from a document image
   * @param imagePath - Path to document image
   * @param documentType - Type of document
   * @returns Promise with extracted structured data
   */
  extractStructuredData(
    imagePath: string,
    documentType: 'prescription' | 'lab_report' | 'invoice' | 'form',
  ): Promise<{
    rawText: string;
    structuredData: Record<string, unknown>;
    confidence: number;
    processingTimeMs: number;
  }>;

  /**
   * Extract text from multiple pages (PDF)
   * @param filePath - Path to PDF file
   * @param language - Language for OCR
   * @param pageRange - Optional page range (e.g., '1-5', '1,3,5')
   * @returns Promise with text from all pages
   */
  extractTextFromPdf(
    filePath: string,
    language?: string,
    pageRange?: string,
  ): Promise<{
    pages: Array<{
      pageNumber: number;
      text: string;
      confidence: number;
    }>;
    totalPages: number;
    processingTimeMs: number;
  }>;

  /**
   * Recognize handwriting from image
   * @param imagePath - Path to image with handwriting
   * @param language - Language for recognition
   * @returns Promise with recognized text
   */
  recognizeHandwriting(
    imagePath: string,
    language?: string,
  ): Promise<{
    text: string;
    confidence: number;
    warnings?: string[];
  }>;

  /**
   * Detect and correct OCR errors using dictionary
   * @param text - Text with potential OCR errors
   * @param language - Language for correction
   * @returns Promise with corrected text
   */
  correctOcrErrors(
    text: string,
    language?: string,
  ): Promise<{
    correctedText: string;
    corrections: Array<{
      original: string;
      corrected: string;
      confidence: number;
    }>;
  }>;

  /**
   * Extract prescription medications from image
   * @param imagePath - Path to prescription image
   * @returns Promise with extracted medications
   */
  extractMedications(imagePath: string): Promise<{
    medications: Array<{
      name: string;
      dosage: string;
      frequency: string;
      duration: string;
      confidence: number;
    }>;
    prescriberName?: string;
    prescriptionDate?: string;
    warnings?: string[];
  }>;

  /**
   * Extract lab values from report image
   * @param imagePath - Path to lab report image
   * @returns Promise with extracted lab values
   */
  extractLabValues(imagePath: string): Promise<{
    testName: string;
    values: Array<{
      parameter: string;
      value: string;
      unit: string;
      referenceRange?: string;
      abnormal?: boolean;
    }>;
    labName?: string;
    testDate?: string;
    confidence: number;
  }>;

  /**
   * Check service health/availability
   * @returns Promise with service status
   */
  healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unavailable';
    message?: string;
  }>;
}

export const OCR_SERVICE_TOKEN = 'IOcrService';
