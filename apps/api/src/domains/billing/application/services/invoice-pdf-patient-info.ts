import type { PDFPatientInfo } from '@workspace/types';
import { getPatientFullName } from '@workspace/utils';
import type { InvoiceDetail } from '@/domains/billing/core/repositories/invoice.repository';

export function buildPdfPatientInfo(
  patient: NonNullable<InvoiceDetail['patient']>,
): PDFPatientInfo {
  return {
    name: getPatientFullName(patient),
    phoneNumber: patient.phoneNumber || '',
    email: patient.email || undefined,
    address: patient.address || undefined,
    patientId: patient.id.slice(0, 8).toUpperCase(),
  };
}
