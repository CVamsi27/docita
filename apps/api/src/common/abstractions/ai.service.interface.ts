export interface IAIService {
  generateClinicalNotes(
    consultationText: string,
    context?: {
      patientId: string;
      previousDiagnosis?: string[];
      medications?: string[];
    },
  ): Promise<{
    summary: string;
    diagnosis: string[];
    recommendations: string[];
    confidence: number;
  }>;

  suggestICD10Codes(
    diagnosis: string,
    confidenceThreshold?: number,
  ): Promise<{
    codes: Array<{
      code: string;
      description: string;
      confidence: number;
    }>;
  }>;

  checkDrugInteractions(medications: string[]): Promise<{
    interactions: Array<{
      medication1: string;
      medication2: string;
      severity: 'critical' | 'major' | 'moderate' | 'minor';
      description: string;
    }>;
  }>;

  analyzeDocument(
    documentPath: string,
    documentType: 'prescription' | 'lab_report' | 'radiology' | 'general',
  ): Promise<{
    extractedText: string;
    structuredData: Record<string, unknown>;
    confidence: number;
    warnings?: string[];
  }>;

  generateHealthRecommendations(patientData: {
    age: number;
    gender: 'M' | 'F' | 'O';
    conditions: string[];
    medications: string[];
    lifestyle?: Record<string, unknown>;
  }): Promise<{
    recommendations: string[];
    priority: 'high' | 'medium' | 'low';
    evidenceLinks?: string[];
  }>;

  predictRiskScore(
    patientData: Record<string, unknown>,
    riskType: 'readmission' | 'complication' | 'mortality',
  ): Promise<{
    score: number;
    riskLevel: 'low' | 'medium' | 'high';
    factors: Array<{ factor: string; impact: number }>;
  }>;

  validateMedicalText(text: string): Promise<{
    valid: boolean;
    suggestions?: string[];
    corrections?: Array<{ original: string; suggested: string }>;
  }>;
}

export const AI_SERVICE_TOKEN = 'IAIService';
