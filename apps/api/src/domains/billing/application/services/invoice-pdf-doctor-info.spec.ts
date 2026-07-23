import type { InvoiceDetail } from '@/domains/billing/core/repositories/invoice.repository';
import { buildPdfDoctorInfo } from './invoice-pdf-doctor-info';

function createBaseInvoice(): InvoiceDetail {
  return {
    id: 'inv-1',
    clinicId: 'clinic-1',
    invoiceNumber: 'INV-001',
    invoiceType: 'TAX_INVOICE',
    currency: 'INR',
    total: 1000,
    subtotal: 850,
    discountTotal: 50,
    taxTotal: 200,
    grandTotal: 1000,
    totalCents: 100000,
    subtotalCents: 85000,
    discountTotalCents: 5000,
    taxTotalCents: 20000,
    grandTotalCents: 100000,
    amountPaidCents: 0,
    status: 'PENDING',
    items: [],
    issuedAt: new Date(),
    dueDate: new Date(),
    createdAt: new Date(),
    patientId: 'pat-1',
    taxSummary: null,
    sellerTaxSnapshot: null,
    buyerTaxSnapshot: null,
    placeOfSupplyStateCode: null,
    placeOfSupplyStateName: null,
    reverseCharge: false,
    eInvoiceRequired: false,
    eInvoiceIrn: null,
    eInvoiceQrCode: null,
    eInvoiceAcknowledgedAt: null,
    doctorName: null,
    doctorEmail: null,
    doctorPhone: null,
    doctorSpecialization: null,
    doctorRegistrationNumber: null,
    updatedAt: new Date(),
    pdfUrl: null,
    pdfGeneratedAt: null,
    pdfTemplateVersion: 1,
    patient: null,
    appointment: null,
  } as InvoiceDetail;
}

describe('buildPdfDoctorInfo', () => {
  it('returns doctor info from appointment relation when available', () => {
    const invoice = createBaseInvoice();
    invoice.appointment = {
      id: 'apt-1',
      startTime: new Date(),
      advanceAmountCents: 0,
      advancePaymentMethod: null,
      advanceReference: null,
      advanceNotes: null,
      doctor: {
        id: 'doc-1',
        name: 'Dr. Patel',
        qualification: 'MBBS, MD',
        registrationNumber: 'REG-456',
      },
    };
    const result = buildPdfDoctorInfo(invoice);
    expect(result.name).toBe('Dr. Patel');
    expect(result.qualification).toBe('MBBS, MD');
    expect(result.registrationNumber).toBe('REG-456');
  });

  it('falls back to top-level doctor fields when no appointment', () => {
    const invoice = createBaseInvoice();
    invoice.appointment = null;
    invoice.doctorName = 'Dr. Johnson';
    invoice.doctorSpecialization = 'Neurology';
    invoice.doctorRegistrationNumber = 'REG-789';
    const result = buildPdfDoctorInfo(invoice);
    expect(result.name).toBe('Dr. Johnson');
    expect(result.qualification).toBe('Neurology');
    expect(result.registrationNumber).toBe('REG-789');
  });

  it('returns empty name when no doctor info is available', () => {
    const invoice = createBaseInvoice();
    invoice.appointment = null;
    invoice.doctorName = null;
    const result = buildPdfDoctorInfo(invoice);
    expect(result.name).toBe('');
  });

  it('converts null qualification to undefined from appointment', () => {
    const invoice = createBaseInvoice();
    invoice.appointment = {
      id: 'apt-1',
      startTime: new Date(),
      advanceAmountCents: 0,
      advancePaymentMethod: null,
      advanceReference: null,
      advanceNotes: null,
      doctor: {
        id: 'doc-1',
        name: 'Dr. Lee',
        qualification: null,
        registrationNumber: null,
      },
    };
    const result = buildPdfDoctorInfo(invoice);
    expect(result.qualification).toBeUndefined();
    expect(result.registrationNumber).toBeUndefined();
  });

  it('converts null doctorSpecialization to undefined from top-level', () => {
    const invoice = createBaseInvoice();
    invoice.appointment = null;
    invoice.doctorName = 'Dr. Kim';
    invoice.doctorSpecialization = null;
    invoice.doctorRegistrationNumber = null;
    const result = buildPdfDoctorInfo(invoice);
    expect(result.qualification).toBeUndefined();
    expect(result.registrationNumber).toBeUndefined();
  });
});
