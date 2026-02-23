// AI Service Type Definitions

export interface OcrMedicationExtraction {
  name: string;
  dosage: string;
  frequency: string;
  route?: string;
  duration?: string;
  indication?: string;
  strength?: string;
  quantity?: string;
}

export interface OcrInvoiceComponent {
  description: string;
  amount: string;
  quantity?: string;
}

export interface OcrInvoiceData {
  invoiceNumber?: string;
  invoiceDate?: string;
  totalAmount?: string;
  components?: OcrInvoiceComponent[];
  consultationFee?: string;
  testsFee?: string;
  procedureFee?: string;
  medicationFee?: string;
  discount?: string;
  discountPercentage?: string;
  taxAmount?: string;
  paymentMethod?: string;
  paymentStatus?: string;
}

export interface OcrVitalsData {
  bp?: string;
  temp?: string;
  pulse?: string;
  respiratoryRate?: string;
  spO2?: string;
  glucose?: string;
  weight?: string;
  height?: string;
  bmi?: string;
}

export interface OcrLabValues {
  hemoglobin?: string;
  creatinine?: string;
  glucose?: string;
  [key: string]: string | undefined;
}

export interface OcrExtractedFields {
  // Patient Information
  firstName?: string;
  lastName?: string;
  age?: string;
  dateOfBirth?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  phoneNumber?: string;
  email?: string;
  bloodType?: string;
  patientId?: string;

  // Clinical Data
  diagnosis?: string;
  symptoms?: string[];
  medicalHistory?: string[];
  allergies?: string[];
  complaints?: string[];
  physicalExamination?: string;

  // Vitals
  vitals?: OcrVitalsData;

  // Lab Values
  labValues?: OcrLabValues;

  // Medications
  medications?: OcrMedicationExtraction[];

  // Prescription Information
  prescriptionDate?: string;
  prescriptionId?: string;
  expiryDate?: string;
  documentDate?: string;
  referralDate?: string;

  // Invoice/Billing Information
  invoice?: OcrInvoiceData;

  // Document Metadata
  doctorName?: string;
  doctorLicense?: string;
  doctorSpecialization?: string;
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  visitDate?: string;
  visitTime?: string;
  nextVisitDate?: string;
  referralTo?: string;

  // Document Analysis
  documentType?:
    | "PRESCRIPTION"
    | "CASE_SHEET"
    | "LAB_REPORT"
    | "INVOICE"
    | "GENERAL";
  notes?: string;
  followUpRecommendations?: string[];

  // Confidence scores per field
  fieldConfidence: Record<string, number>;
}

export interface OcrExtractionResult {
  text: string;
  documentType: "PRESCRIPTION" | "CASE_SHEET" | "LAB_REPORT" | "GENERAL";
  confidence: number;
  fields: OcrExtractedFields;
  suggestedCorrections?: Record<string, unknown>;
}

export interface PrescriptionAnalysisRequest {
  medications: Array<{ name: string; dosage: string }>;
  patientAge?: number;
  patientAllergies?: string[];
  existingConditions?: string[];
}

export interface Contraindication {
  medication: string;
  condition: string;
  description: string;
}

export interface DosageRecommendation {
  medication: string;
  status: "appropriate" | "high" | "low";
  recommendation: string;
}

export interface PrescriptionAnalysisResponse {
  drugInteractions: Array<{
    drug1: string;
    drug2: string;
    severity: "mild" | "moderate" | "severe";
    description: string;
  }>;
  contraindications: Contraindication[];
  dosageRecommendations: DosageRecommendation[];
}

export interface MedicationRecommendation {
  medicationName: string;
  strength: string;
  frequency: string;
  indication: string;
  confidence: number;
}

// OpenAI Response Normalization Types
export interface OpenAIPrescriptionAnalysisData {
  drugInteractions?: Array<{
    drug1?: string;
    drug2?: string;
    severity?: string;
    description?: string;
  }>;
  contraindications?: Array<{
    medication?: string;
    condition?: string;
    description?: string;
  }>;
  dosageRecommendations?: Array<{
    medication?: string;
    status?: string;
    recommendation?: string;
  }>;
}

export interface OpenAIDiagnosisData {
  suggestions?: Array<{
    icdCode: string;
    diagnosis: string;
    confidence: number;
    description: string;
  }>;
  [key: string]: unknown;
}

export interface OpenAIMedicationData {
  recommendations?: MedicationRecommendation[];
  [key: string]: unknown;
}
