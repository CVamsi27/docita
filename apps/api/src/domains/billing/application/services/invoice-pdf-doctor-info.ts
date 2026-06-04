import type { PDFDoctorInfo } from '@workspace/types';
import type { InvoiceDetail } from '@/domains/billing/core/repositories/invoice.repository';

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
