export interface IOcrService {
  extractText(
    imagePath: string,
    language?: string,
  ): Promise<{
    text: string;
    confidence: number;
    language: string;
  }>;

  extractStructuredData(
    imagePath: string,
    documentType: 'prescription' | 'lab_report' | 'invoice' | 'form',
  ): Promise<{
    rawText: string;
    structuredData: Record<string, unknown>;
    confidence: number;
    processingTimeMs: number;
  }>;

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

  recognizeHandwriting(
    imagePath: string,
    language?: string,
  ): Promise<{
    text: string;
    confidence: number;
    warnings?: string[];
  }>;

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

  healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unavailable';
    message?: string;
  }>;
}

export const OCR_SERVICE_TOKEN = 'IOcrService';
