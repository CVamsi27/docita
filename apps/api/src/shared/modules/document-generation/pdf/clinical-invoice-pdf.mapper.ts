import type {
  PDFClinicInfo,
  PDFDoctorInfo,
  PDFInvoiceItem,
  PDFPatientInfo,
} from '@workspace/types';
import type { ClinicalInvoicePdfInput } from './clinical-invoice-pdf.service';
import type { InvoicePdfInput } from './pdf.types';

export function isClinicalInvoiceInput(data: InvoicePdfInput): boolean {
  return Boolean(
    data.taxSummary ||
    data.sellerTaxSnapshot ||
    data.buyerTaxSnapshot ||
    data.authorizedSignatureUrl ||
    data.hospitalConfig ||
    data.items.some(
      (item) => item.cptCode || item.icdCode || item.gstRate || item.hsnCode,
    ),
  );
}

export function mapInvoicePdfInputToClinical(
  data: InvoicePdfInput,
): ClinicalInvoicePdfInput {
  return {
    invoiceId: data.invoiceId,
    title: data.title,
    clinic: data.clinic as PDFClinicInfo,
    patient: data.patient as PDFPatientInfo,
    doctor: data.doctor as PDFDoctorInfo | undefined,
    taxSummary: data.taxSummary,
    sellerTaxSnapshot: data.sellerTaxSnapshot,
    buyerTaxSnapshot: data.buyerTaxSnapshot,
    authorizedSignatureUrl: data.authorizedSignatureUrl,
    authorizedSignatureLabel: data.authorizedSignatureLabel,
    items: data.items as PDFInvoiceItem[],
    date: data.date,
    dueDate: data.dueDate,
    status: data.status,
    hospitalConfig: data.hospitalConfig,
  };
}
