import type { InvoicePdfInput, PrescriptionPdfInput } from './pdf.types';
import type { PDFConfig } from './pdf-config.types';

export type {
  PDFClinicInfo,
  PDFDoctorInfo,
  PDFPatientInfo,
  PDFMedicationInfo,
  PDFInvoiceItem,
} from './pdf.types';

/**
 * Strategy contract for PDF document generation (prescription, invoice, …).
 *
 * Production clinic invoices use {@link ClinicalInvoicePdfService} (GST/tax layout).
 * Billing `PDFService` is a thin alias; `PDFGeneratorService` delegates clinical
 * inputs to the same generator and uses `InvoicePdfRenderer` for simple receipts.
 */
export interface IPdfDocumentRenderer {
  generatePrescription(data: PrescriptionPdfInput): Promise<Buffer>;

  generateInvoice(data: InvoicePdfInput): Promise<Buffer>;

  generate(config: PDFConfig): Promise<Buffer>;
}

export const PDF_DOCUMENT_RENDERER = 'IPdfDocumentRenderer';
