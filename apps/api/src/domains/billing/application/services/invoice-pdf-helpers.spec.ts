import type { InvoiceDetail } from '@/domains/billing/core/repositories/invoice.repository';
import { buildPdfInvoiceId, buildPdfTitle } from './invoice-pdf-document';
import { buildPdfItems } from './invoice-pdf-items';
import { buildProcedureCptMap } from './invoice-pdf-procedure-map';
import { buildPdfClinicInfo } from './invoice-pdf-clinic-info';
import { buildPdfDoctorInfo } from './invoice-pdf-doctor-info';
import { buildPdfPatientInfo } from './invoice-pdf-patient-info';

function createBaseInvoice(): InvoiceDetail {
  return {
    id: 'inv-123456789',
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
    doctorName: 'Dr. Smith',
    doctorEmail: null,
    doctorPhone: null,
    doctorSpecialization: 'Cardiology',
    doctorRegistrationNumber: 'REG-123',
    updatedAt: new Date(),
    pdfUrl: null,
    pdfGeneratedAt: null,
    pdfTemplateVersion: 1,
    patient: null,
    appointment: null,
  } as InvoiceDetail;
}

describe('buildPdfInvoiceId', () => {
  it('returns invoiceNumber when present', () => {
    const invoice = createBaseInvoice();
    expect(buildPdfInvoiceId(invoice)).toBe('INV-001');
  });

  it('falls back to truncated uppercase id when invoiceNumber is null', () => {
    const invoice = createBaseInvoice();
    invoice.invoiceNumber = null;
    expect(buildPdfInvoiceId(invoice)).toBe('INV-1234');
  });
});

describe('buildPdfTitle', () => {
  it('returns documentTitle from taxSummary when available', () => {
    const invoice = createBaseInvoice();
    const taxSummary = {
      countryCode: 'IN',
      regime: 'IN_GST' as const,
      currency: 'INR',
      subtotal: 850,
      discountTotal: 0,
      taxableAmount: 850,
      exemptAmount: 0,
      taxTotal: 150,
      grandTotal: 1000,
      components: [],
      reverseCharge: false,
      documentTitle: 'Tax Invoice Original',
    };
    expect(buildPdfTitle(invoice, taxSummary)).toBe('Tax Invoice Original');
  });

  it('returns "Tax Invoice" for TAX_INVOICE type without taxSummary', () => {
    const invoice = createBaseInvoice();
    invoice.invoiceType = 'TAX_INVOICE';
    expect(buildPdfTitle(invoice, undefined)).toBe('Tax Invoice');
  });

  it('returns "Bill of Supply" for non-TAX_INVOICE type', () => {
    const invoice = createBaseInvoice();
    invoice.invoiceType = 'BILL_OF_SUPPLY';
    expect(buildPdfTitle(invoice, undefined)).toBe('Bill of Supply');
  });
});

describe('buildPdfItems', () => {
  it('maps basic item fields correctly', () => {
    const items = [
      {
        description: 'Consultation',
        quantity: 1,
        unitPrice: 500,
        price: 500,
        lineTotal: 500,
        discountAmount: 0,
        taxAmount: 90,
        cptCode: '99213',
        hsnCode: '9983',
        taxRate: 18,
      },
    ];
    const result = buildPdfItems(items, {});
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      description: 'Consultation',
      quantity: 1,
      unitPrice: 500,
      amount: 500,
      cptCode: '99213',
      hsnCode: '9983',
      gstRate: 18,
    });
  });

  it('calculates amount from quantity and unitPrice when lineTotal is absent', () => {
    const items = [
      {
        description: 'Lab Test',
        quantity: 3,
        unitPrice: 100,
        price: 100,
        discountAmount: 10,
        taxAmount: 50,
      },
    ];
    const result = buildPdfItems(items, {});
    // 3 * 100 - 10 + 50 = 340
    expect(result[0].amount).toBe(340);
  });

  it('uses price when unitPrice is absent', () => {
    const items = [
      {
        description: 'Item',
        quantity: 1,
        price: 250,
        lineTotal: 250,
        discountAmount: 0,
        taxAmount: 0,
      },
    ];
    const result = buildPdfItems(items, {});
    expect(result[0].unitPrice).toBe(250);
  });

  it('falls back to procedureCptMap for cptCode', () => {
    const items = [
      {
        description: 'X-Ray',
        quantity: 1,
        unitPrice: 200,
        price: 200,
        lineTotal: 200,
        discountAmount: 0,
        taxAmount: 0,
      },
    ];
    const cptMap = { 'X-Ray': '71046' };
    const result = buildPdfItems(items, cptMap);
    expect(result[0].cptCode).toBe('71046');
  });

  it('returns empty array for empty items', () => {
    expect(buildPdfItems([], {})).toEqual([]);
  });
});

describe('buildProcedureCptMap', () => {
  it('maps description to cptCode', () => {
    const procedures = [
      {
        description: 'X-Ray',
        cptCode: { code: '71046', description: 'Chest X-Ray' },
      },
      {
        description: 'ECG',
        cptCode: { code: '93000', description: 'Electrocardiogram' },
      },
    ];
    const result = buildProcedureCptMap(procedures);
    expect(result).toEqual({ 'X-Ray': '71046', ECG: '93000' });
  });

  it('skips procedures with null cptCode', () => {
    const procedures = [
      { description: 'Consultation', cptCode: null },
      {
        description: 'Lab Work',
        cptCode: { code: '80053', description: 'Lab' },
      },
    ];
    const result = buildProcedureCptMap(procedures);
    expect(result).toEqual({ 'Lab Work': '80053' });
  });

  it('skips procedures with empty cptCode code', () => {
    const procedures = [
      { description: 'Test', cptCode: { code: '', description: '' } },
    ];
    const result = buildProcedureCptMap(procedures);
    expect(result).toEqual({});
  });

  it('returns empty map for null input', () => {
    expect(buildProcedureCptMap(null)).toEqual({});
  });

  it('returns empty map for undefined input', () => {
    expect(buildProcedureCptMap(undefined)).toEqual({});
  });

  it('returns empty map for empty array', () => {
    expect(buildProcedureCptMap([])).toEqual({});
  });
});

describe('buildPdfClinicInfo', () => {
  it('maps all fields from clinic and tax snapshot', () => {
    const clinic = {
      name: 'Sunrise Clinic',
      address: '123 Main St',
      phone: '9876543210',
      email: 'info@sunrise.com',
      logo: 'https://example.com/logo.png',
      currency: 'INR',
      branding: null,
    };
    const taxSnapshot = {
      countryCode: 'IN',
      regime: 'IN_GST' as const,
      registrationId: '27AABCU9603R1ZM',
    };
    const result = buildPdfClinicInfo(clinic, taxSnapshot);
    expect(result.name).toBe('Sunrise Clinic');
    expect(result.address).toBe('123 Main St');
    expect(result.phone).toBe('9876543210');
    expect(result.email).toBe('info@sunrise.com');
    expect(result.logo).toBe('https://example.com/logo.png');
    expect(result.currency).toBe('INR');
    expect(result.gstin).toBe('27AABCU9603R1ZM');
  });

  it('uses nullish coalescing for optional fields', () => {
    const clinic = {
      name: 'Clinic',
      address: null,
      phone: null,
      email: null,
      logo: null,
      currency: null,
      branding: null,
    };
    const result = buildPdfClinicInfo(clinic, undefined);
    expect(result.address).toBeUndefined();
    expect(result.phone).toBeUndefined();
    expect(result.email).toBeUndefined();
    expect(result.logo).toBeUndefined();
    expect(result.currency).toBeUndefined();
    expect(result.gstin).toBeUndefined();
  });

  it('extracts gstin from clinic settings when no tax snapshot is provided', () => {
    const clinic = {
      name: 'Clinic',
      address: null,
      phone: null,
      email: null,
      logo: null,
      currency: null,
      branding: null,
      settings: { gstin: '27ZZZZZ9999X1Z5' },
    };
    const result = buildPdfClinicInfo(clinic, undefined);
    expect(result.gstin).toBe('27ZZZZZ9999X1Z5');
  });
});

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
});

describe('buildPdfPatientInfo', () => {
  it('maps patient fields correctly', () => {
    const patient = {
      id: 'pat-1234567890',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '1234567890',
      email: 'john@example.com',
      address: '456 Oak Ave',
    };
    const result = buildPdfPatientInfo(
      patient as NonNullable<InvoiceDetail['patient']>,
    );
    expect(result.name).toBe('John Doe');
    expect(result.phoneNumber).toBe('1234567890');
    expect(result.email).toBe('john@example.com');
    expect(result.address).toBe('456 Oak Ave');
    expect(result.patientId).toBe('PAT-1234');
  });

  it('handles missing optional fields', () => {
    const patient = {
      id: 'pat-abc',
      firstName: 'Jane',
      lastName: 'Smith',
      phoneNumber: null,
      email: null,
      address: null,
    };
    const result = buildPdfPatientInfo(
      patient as NonNullable<InvoiceDetail['patient']>,
    );
    expect(result.phoneNumber).toBe('');
    expect(result.email).toBeUndefined();
    expect(result.address).toBeUndefined();
  });
});
