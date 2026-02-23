export interface ExtractedText {
  text: string;
  confidence: number;
  documentType: "PRESCRIPTION" | "CASE_SHEET" | "LAB_REPORT" | "GENERAL";
}

export interface OCRMedication {
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  duration: string;
}

export interface OCRVitals {
  bp: string;
  temp: string;
  pulse: string;
  respiratoryRate: string;
  spO2: string;
  glucose: string;
}

export interface OCRLabValues {
  glucose: string;
  hemoglobin: string;
  creatinine: string;
}

export interface OCRInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface EmergencyContact {
  name: string;
  phoneNumber: string;
  relation: string;
}

export interface ParsedMedicalFields {
  // Patient Details
  firstName: string;
  lastName: string;
  mrn: string;
  preferredName: string;
  pronouns: string;
  address: string;
  race: string;
  ethnicity: string;
  maritalStatus: string;
  preferredLanguage: string;
  age: string;
  gender: string;
  phoneNumber: string;
  email: string;
  bloodType: string;
  emergencyContact: EmergencyContact | null;

  // Dates
  dateOfBirth: string;
  visitDate: string;
  invoiceDate: string;
  admissionDate: string;

  // Metadata
  clinicName: string;
  doctorName: string;

  // Medical Data
  diagnosis: string;
  symptoms: string[];
  allergies: string[];
  medicalHistory: string[];
  medications: OCRMedication[];
  vitals: OCRVitals;
  labValues: OCRLabValues;

  // Invoice Data
  invoice: {
    total: number | null;
    tax: number | null;
    discount: number | null;
    subtotal: number | null;
    items: OCRInvoiceItem[];
  };
}

// ============================================================================
// OCR Raw Data Types (for AI service parsing)
// ============================================================================

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

/**
 * Raw OCR data from AI parsing (before normalization)
 * Used to type the `data` parameter in normalizeOcrFields
 */
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

export interface FieldConfidenceConfig {
  medicalFields: number;
  contactFields: number;
  vitalFields: number;
}
