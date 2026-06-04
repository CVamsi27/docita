import {
  extractPdfTheme,
  type PDFClinicInfo,
  type PDFPatientInfo,
  type PDFDoctorInfo,
  type PDFInvoiceItem,
  type InvoiceItem,
  type InvoiceTaxSummary,
  type TaxRegistrationSnapshot,
  type JsonValue,
} from '@workspace/types';
import { getPatientFullName } from '@workspace/utils';
import { extractClinicGstin } from './invoices-helpers';
import type { InvoiceDetail } from '@/domains/billing/core/repositories/invoice.repository';

export function buildProcedureCptMap(
  procedures:
    | Array<{
        description: string;
        cptCode: { code: string; description: string } | null;
      }>
    | null
    | undefined,
): Record<string, string> {
  const map: Record<string, string> = {};
  if (procedures) {
    for (const proc of procedures) {
      if (proc.cptCode?.code) {
        map[proc.description] = proc.cptCode.code;
      }
    }
  }
  return map;
}

export function buildPdfInvoiceId(invoice: InvoiceDetail): string {
  return invoice.invoiceNumber ?? invoice.id.slice(0, 8).toUpperCase();
}

export function buildPdfTitle(
  invoice: InvoiceDetail,
  taxSummary: InvoiceTaxSummary | undefined,
): string {
  return (
    taxSummary?.documentTitle ??
    (invoice.invoiceType === 'TAX_INVOICE' ? 'Tax Invoice' : 'Bill of Supply')
  );
}

export function buildPdfClinicInfo(
  clinic: {
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    logo: string | null;
    currency: string | null;
    branding: JsonValue | null;
    settings?: JsonValue | null;
  },
  sellerTaxSnapshot: TaxRegistrationSnapshot | undefined,
): PDFClinicInfo {
  return {
    name: clinic.name,
    address: clinic.address || undefined,
    phone: clinic.phone || undefined,
    email: clinic.email || undefined,
    logo: clinic.logo || undefined,
    currency: clinic.currency || undefined,
    branding: extractPdfTheme(clinic.branding),
    gstin: sellerTaxSnapshot?.registrationId ?? extractClinicGstin(clinic),
  };
}

export function buildPdfPatientInfo(
  patient: NonNullable<InvoiceDetail['patient']>,
): PDFPatientInfo {
  return {
    name: getPatientFullName(patient),
    phoneNumber: patient?.phoneNumber || '',
    email: patient?.email || undefined,
    address: patient?.address || undefined,
    patientId: patient?.id.slice(0, 8).toUpperCase() || '',
  };
}

export function buildPdfDoctorInfo(invoice: InvoiceDetail): PDFDoctorInfo {
  if (invoice.appointment?.doctor) {
    return {
      name: invoice.appointment.doctor.name,
      qualification: invoice.appointment.doctor.qualification || undefined,
      registrationNumber:
        invoice.appointment.doctor.registrationNumber || undefined,
    };
  }
  return {
    name: invoice.doctorName || '',
    qualification: invoice.doctorSpecialization || undefined,
    registrationNumber: invoice.doctorRegistrationNumber || undefined,
  };
}

export function buildPdfItems(
  items: InvoiceItem[],
  procedureCptMap: Record<string, string>,
): PDFInvoiceItem[] {
  return items.map((item) => ({
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice ?? item.price,
    amount:
      item.lineTotal ??
      item.quantity * (item.unitPrice ?? item.price) -
        (item.discountAmount ?? 0) +
        (item.taxAmount ?? 0),
    cptCode: item.cptCode ?? procedureCptMap[item.description],
    hsnCode: item.hsnCode ?? item.sacCode,
    gstRate: item.taxRate,
  }));
}
