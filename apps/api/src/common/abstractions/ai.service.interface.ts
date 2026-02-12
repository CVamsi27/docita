/**
 * AI Service Interface
 *
 * Defines the contract for AI/ML operations.
 * Supports multiple LLM providers (OpenAI, Anthropic, etc.)
 *
 * @interface IAIService
 */
export interface IAIService {
  /**
   * Generate clinical notes from patient consultation
   * @param consultationText - Raw consultation notes or transcript
   * @param context - Additional context (patient history, etc.)
   * @returns Promise with structured clinical notes
   */
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

  /**
   * Suggest ICD-10 codes for a diagnosis
   * @param diagnosis - Diagnosis description
   * @param confidenceThreshold - Minimum confidence to include (0-1)
   * @returns Promise with suggested codes
   */
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

  /**
   * Check for drug interactions
   * @param medications - List of medication names
   * @returns Promise with interaction warnings
   */
  checkDrugInteractions(medications: string[]): Promise<{
    interactions: Array<{
      medication1: string;
      medication2: string;
      severity: 'critical' | 'major' | 'moderate' | 'minor';
      description: string;
    }>;
  }>;

  /**
   * Analyze medical documents via OCR + AI
   * @param documentPath - Path to document file
   * @param documentType - Type of document (prescription, report, etc.)
   * @returns Promise with extracted and structured data
   */
  analyzeDocument(
    documentPath: string,
    documentType: 'prescription' | 'lab_report' | 'radiology' | 'general',
  ): Promise<{
    extractedText: string;
    structuredData: Record<string, unknown>;
    confidence: number;
    warnings?: string[];
  }>;

  /**
   * Generate personalized health recommendations
   * @param patientData - Patient medical and lifestyle data
   * @returns Promise with recommendations
   */
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

  /**
   * Predict patient risk scores (readmission, complications, etc.)
   * @param patientData - Patient clinical data
   * @param riskType - Type of risk to predict
   * @returns Promise with risk score
   */
  predictRiskScore(
    patientData: Record<string, unknown>,
    riskType: 'readmission' | 'complication' | 'mortality',
  ): Promise<{
    score: number; // 0-100
    riskLevel: 'low' | 'medium' | 'high';
    factors: Array<{ factor: string; impact: number }>;
  }>;

  /**
   * Check text for medical correctness
   * @param text - Text to validate
   * @returns Promise with validation result
   */
  validateMedicalText(text: string): Promise<{
    valid: boolean;
    suggestions?: string[];
    corrections?: Array<{ original: string; suggested: string }>;
  }>;
}

export const AI_SERVICE_TOKEN = 'IAIService';
