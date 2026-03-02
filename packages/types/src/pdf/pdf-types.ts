export interface PDFClinicInfo {
  name: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  logo?: Buffer | string;
  registrationNumber?: string; 
  gstin?: string; 
  website?: string;
}

export interface PDFDoctorInfo {
  name: string;
  qualification?: string; 
  registrationNumber?: string; 
  licenseNumber?: string; 
  specialization?: string;
  signatureUrl?: string;
  councilName?: string; 
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
  patientId?: string; 
  allergies?: string[]; 
  weight?: number; 
  height?: number; 
}

export interface PDFMedicationInfo {
  name: string; 
  genericName?: string; 
  dosage: string; 
  route: string; 
  frequency: string; 
  duration: string; 
  timing?: string; 
  specialInstructions?: string; 
  quantity?: number; 
}

export interface PDFInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  hsnCode?: string; 
  gstRate?: number; 
}

export interface TableColumn {
  header: string;
  key: string;
  width: number;
  align?: "left" | "center" | "right";
}

export type PDFDocumentType = "prescription" | "invoice" | "report" | "receipt";
