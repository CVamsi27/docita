export interface OcrExtractedFields {
  // Patient Information
  firstName: string;
  lastName: string;
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
  vitals?: {
    bp?: string;
    temp?: string;
    pulse?: string;
    respiratoryRate?: string;
    spO2?: string;
    glucose?: string;
    weight?: string;
    height?: string;
    bmi?: string;
  };

  // Lab Values
  labValues?: {
    hemoglobin?: string;
    creatinine?: string;
    glucose?: string;
    [key: string]: string | undefined;
  };

  // Medications (detailed extraction)
  medications?: Array<{
    name: string;
    dosage: string;
    frequency: string;
    route?: string;
    duration?: string;
    indication?: string;
    strength?: string;
    quantity?: string;
  }>;

  // Prescription Information
  prescriptionDate?: string;
  prescriptionId?: string;
  expiryDate?: string;
  documentDate?: string;
  referralDate?: string;

  // Invoice/Billing Information
  invoice?: {
    invoiceNumber?: string;
    invoiceDate?: string;
    totalAmount?: string;
    components?: Array<{
      description: string;
      amount: string;
      quantity?: string;
    }>;
    consultationFee?: string;
    testsFee?: string;
    procedureFee?: string;
    medicationFee?: string;
    discount?: string;
    discountPercentage?: string;
    taxAmount?: string;
    paymentMethod?: string;
    paymentStatus?: string;
  };

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
  suggestedCorrections?: Record<string, string>;
}

export interface FieldConfidenceConfig {
  medicalFields: number;
  contactFields: number;
  vitalFields: number;
}

export interface OcrRawData {
  firstName?: string;
  lastName?: string;
  patientId?: string;
  age?: string | number;
  dateOfBirth?: string;
  gender?: string;
  phoneNumber?: string;
  email?: string;
  bloodType?: string;
  diagnosis?: string;
  symptoms?: string[];
  complaints?: string;
  medicalHistory?: string[];
  allergies?: string[];
  physicalExamination?: string;
  vitals?: {
    bp?: string;
    temp?: string | number;
    pulse?: string | number;
    respiratoryRate?: string | number;
    spO2?: string | number;
    weight?: string | number;
    height?: string | number;
    bmi?: string | number;
  };
  labValues?: {
    hemoglobin?: string;
    creatinine?: string;
    glucose?: string;
    [key: string]: string | undefined;
  };
  medications?: Array<{
    name?: string;
    dosage?: string;
    frequency?: string;
    route?: string;
    duration?: string;
    indication?: string;
    strength?: string;
    quantity?: string;
  }>;
  prescriptionDate?: string;
  prescriptionId?: string;
  documentDate?: string;
  visitDate?: string;
  visitTime?: string;
  expiryDate?: string;
  nextVisitDate?: string;
  referralDate?: string;
  doctorName?: string;
  doctorLicense?: string;
  doctorSpecialization?: string;
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  referralTo?: string;
  notes?: string;
  followUpRecommendations?: string[];
  invoice?: {
    invoiceNumber?: string;
    invoiceDate?: string;
    totalAmount?: string | number;
    components?: Array<{
      description?: string;
      amount?: string | number;
      quantity?: string | number;
    }>;
    consultationFee?: string | number;
    testsFee?: string | number;
    procedureFee?: string | number;
    medicationFee?: string | number;
    discount?: string | number;
    discountPercentage?: string | number;
    taxAmount?: string | number;
    paymentMethod?: string;
    paymentStatus?: string;
  };
}

export interface PrescriptionAnalysisRequest {
  medications: Array<{ name: string; dosage: string }>;
  patientAge?: number;
  patientAllergies?: string[];
  existingConditions?: string[];
}

export interface PrescriptionAnalysisResponse {
  drugInteractions: Array<{
    drug1: string;
    drug2: string;
    severity: "mild" | "moderate" | "severe";
    description: string;
  }>;
  contraindications: Array<{
    medication: string;
    condition: string;
    description: string;
  }>;
  dosageRecommendations: Array<{
    medication: string;
    status: "appropriate" | "high" | "low";
    recommendation: string;
  }>;
}

export interface DiagnosisSuggestion {
  icdCode: string;
  diagnosis: string;
  confidence: number;
  description: string;
}

export interface MedicationRecommendation {
  medicationName: string;
  strength: string;
  frequency: string;
  indication: string;
  confidence: number;
}
