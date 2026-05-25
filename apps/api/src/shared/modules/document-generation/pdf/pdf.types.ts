import type PDFDocument from 'pdfkit';
import type {
  InvoiceTaxSummary,
  PDFHospitalConfig,
  TaxRegistrationSnapshot,
} from '@workspace/types';
import type { PdfLayoutService } from './pdf-layout.service';

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
  cptCode?: string;
  icdCode?: string;
}

export interface TableColumn {
  header: string;
  key: string;
  width: number;
  align?: 'left' | 'center' | 'right';
}

export type PDFDocumentType = 'prescription' | 'invoice' | 'report' | 'receipt';

export interface PDFContext {
  currentY: number;
  pageWidth: number;
  contentWidth: number;
  margin: number;
}

export interface PDFConfig {
  type: PDFDocumentType;
  title: string;
  documentId?: string;
  clinic: PDFClinicInfo;
  patient?: PDFPatientInfo;
  doctor?: PDFDoctorInfo;
  date?: Date;
  margin?: number;
  sections: Array<
    (
      doc: typeof PDFDocument.prototype,
      context: PDFContext,
      layout: PdfLayoutService,
    ) => void
  >;
  footerText?: string;
  showRxSymbol?: boolean;
  validityDays?: number;
}

export interface PrescriptionPdfInput {
  prescriptionId: string;
  clinic: PDFClinicInfo;
  doctor: PDFDoctorInfo;
  patient: PDFPatientInfo;
  medications: PDFMedicationInfo[];
  diagnosis?: string;
  instructions?: string;
  nextVisit?: Date;
  date?: Date;
  validityDays?: number;
}

export interface InvoicePdfInput {
  invoiceId: string;
  title?: string;
  clinic: PDFClinicInfo;
  patient: PDFPatientInfo;
  doctor?: PDFDoctorInfo;
  items: PDFInvoiceItem[];
  /** Simple receipt totals (non-clinical path). */
  subtotal: number;
  discount?: number;
  tax?: number;
  total: number;
  status: string;
  date?: Date;
  dueDate?: Date;
  paymentMethod?: string;
  notes?: string;
  /** When set, routes through {@link ClinicalInvoicePdfService} (GST layout). */
  taxSummary?: InvoiceTaxSummary;
  sellerTaxSnapshot?: TaxRegistrationSnapshot;
  buyerTaxSnapshot?: TaxRegistrationSnapshot;
  authorizedSignatureUrl?: string;
  authorizedSignatureLabel?: string;
  hospitalConfig?: PDFHospitalConfig;
}
