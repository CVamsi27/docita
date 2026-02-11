export interface PDFClinicInfo {
  name: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  logo?: any; // Buffer | string
  registrationNumber?: string; // Clinic registration number
  gstin?: string; // GST number for invoices
  website?: string;
}

export interface PDFDoctorInfo {
  name: string;
  qualification?: string; // e.g., "MBBS, MD (Internal Medicine)"
  registrationNumber?: string; // Medical council registration
  licenseNumber?: string; // Practice license
  specialization?: string;
  signatureUrl?: string;
  councilName?: string; // e.g., "Medical Council of India"
}

export interface PDFPatientInfo {
  name: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  gender?: string;
  age?: number;
  dateOfBirth?: Date;
  bloodGroup?: string;
  patientId?: string; // Unique patient identifier
  allergies?: string[]; // Critical for prescriptions
  weight?: number; // kg - important for dosing
  height?: number; // cm
}

export interface PDFMedicationInfo {
  name: string; // Generic/brand name
  genericName?: string; // Generic name if brand provided
  dosage: string; // e.g., "500mg"
  route: string; // PO, IV, IM, SC, etc.
  frequency: string; // e.g., "TDS", "BD", "OD"
  duration: string; // e.g., "7 days"
  timing?: string; // Before/after meals
  specialInstructions?: string; // e.g., "Take with water"
  quantity?: number; // Total tablets/units to dispense
}

export interface PDFInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  hsnCode?: string; // HSN/SAC code for GST
  gstRate?: number; // GST percentage
}

export interface TableColumn {
  header: string;
  key: string;
  width: number;
  align?: "left" | "center" | "right";
}

export type PDFDocumentType = "prescription" | "invoice" | "report" | "receipt";
