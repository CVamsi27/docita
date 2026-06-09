import type {
  InvoiceTaxSummary,
  PDFClinicInfo,
  PDFDoctorInfo,
  PDFHospitalConfig,
  PDFInvoiceItem,
  PDFMedicationInfo,
  PDFPatientInfo,
  TaxRegistrationSnapshot,
} from '@workspace/types';

export interface PDFContext {
  currentY: number;
  pageWidth: number;
  contentWidth: number;
  margin: number;
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
