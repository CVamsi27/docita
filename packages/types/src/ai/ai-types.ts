

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

  firstName?: string;
  lastName?: string;
  age?: string;
  dateOfBirth?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  phoneNumber?: string;
  email?: string;
  bloodType?: string;
  patientId?: string;

  diagnosis?: string;
  symptoms?: string[];
  medicalHistory?: string[];
  allergies?: string[];
  complaints?: string[];
  physicalExamination?: string;

  vitals?: OcrVitalsData;

  labValues?: OcrLabValues;

  medications?: OcrMedicationExtraction[];

  prescriptionDate?: string;
  prescriptionId?: string;
  expiryDate?: string;
  documentDate?: string;
  referralDate?: string;

  invoice?: OcrInvoiceData;

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

  documentType?:
    | "PRESCRIPTION"
    | "CASE_SHEET"
    | "LAB_REPORT"
    | "INVOICE"
    | "GENERAL";
  notes?: string;
  followUpRecommendations?: string[];

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

export interface DiagnosisSuggestion {
  icdCode: string;
  diagnosis: string;
  confidence: number;
  description: string;
}

export interface FieldConfidenceConfig {
  medicalFields: number;
  contactFields: number;
  vitalFields: number;
}

export interface OcrRawVitals {
  bp?: string;
  temp?: string | number;
  pulse?: string | number;
  respiratoryRate?: string | number;
  spO2?: string | number;
  weight?: string | number;
  height?: string | number;
  bmi?: string | number;
}

export interface OcrRawLabValues {
  hemoglobin?: string;
  creatinine?: string;
  glucose?: string;
  [key: string]: string | undefined;
}

export interface OcrRawMedication {
  name?: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  duration?: string;
  indication?: string;
  strength?: string;
  quantity?: string;
}

export interface OcrRawInvoiceComponent {
  description?: string;
  amount?: string | number;
  quantity?: string | number;
}

export interface OcrRawInvoice {
  invoiceNumber?: string;
  invoiceDate?: string;
  totalAmount?: string | number;
  components?: OcrRawInvoiceComponent[];
  consultationFee?: string | number;
  testsFee?: string | number;
  procedureFee?: string | number;
  medicationFee?: string | number;
  discount?: string | number;
  discountPercentage?: string | number;
  taxAmount?: string | number;
  paymentMethod?: string;
  paymentStatus?: string;
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
  vitals?: OcrRawVitals;
  labValues?: OcrRawLabValues;
  medications?: OcrRawMedication[];
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
  invoice?: OcrRawInvoice;
}
