import { InvoiceStatus } from '@workspace/db';
import { RAJESH_APPOINTMENT_ID, RAJESH_INVOICE_ID } from './seed-constants';

export const INVOICE_STATUS_PLAN: InvoiceStatus[] = [
  InvoiceStatus.PAID,
  InvoiceStatus.PAID,
  InvoiceStatus.PAID,
  InvoiceStatus.PAID,
  InvoiceStatus.PAID,
  InvoiceStatus.PAID,
  InvoiceStatus.PAID,
  InvoiceStatus.PAID,
  InvoiceStatus.PENDING,
  InvoiceStatus.PENDING,
  InvoiceStatus.PENDING,
  InvoiceStatus.PENDING,
  InvoiceStatus.OVERDUE,
  InvoiceStatus.OVERDUE,
  InvoiceStatus.CANCELLED,
];

/**
 * Indian financial year code (e.g. "2627" for FY 2026-27) for the current
 * date, mirroring the API's invoice-number format so seeded invoices read
 * like real ones (DC2627-000001) on camera instead of leaking the row id.
 */
export const SEED_INVOICE_FINANCIAL_YEAR = (() => {
  const now = new Date();
  const startYear =
    now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1;
  return `${String(startYear).slice(-2)}${String(startYear + 1).slice(-2)}`;
})();

export const SEED_INVOICE_PREFIX = 'DC';

export function seedInvoiceNumber(sequence: number): string {
  return `${SEED_INVOICE_PREFIX}${SEED_INVOICE_FINANCIAL_YEAR}-${String(
    sequence,
  ).padStart(6, '0')}`;
}

export function getSeedInvoiceData(
  appt: { id: string; patientId: string },
  clinicId: string,
  index: number,
): {
  appt: { id: string; patientId: string };
  invoiceId: string;
  data: {
    appointmentId: string;
    patientId: string;
    clinicId: string;
    invoiceNumber: string;
    total: number;
    subtotal: number;
    taxTotal: number;
    grandTotal: number;
    status: InvoiceStatus;
    items: Array<{
      description: string;
      quantity: number;
      price: number;
      gstRate: number;
    }>;
    taxSummary:
      | Array<{ rate: number; taxableAmount: number; taxAmount: number }>
      | undefined;
    placeOfSupplyStateCode: string;
    reverseCharge: boolean;
  };
} {
  const invoiceId =
    appt.id === RAJESH_APPOINTMENT_ID
      ? RAJESH_INVOICE_ID
      : `seed-inv-${appt.id}`;
  const consultFee = 800 + (index % 5) * 100;
  const rxFee = 200;
  const vitalsFee = 300;
  const labFee = index % 3 === 0 ? 500 : 0;
  const procedureFee = index % 4 === 0 ? 1000 : 0;

  const items = [
    {
      description: 'Consultation Fee',
      quantity: 1,
      price: consultFee,
      gstRate: 0,
    },
    { description: 'Prescription', quantity: 1, price: rxFee, gstRate: 0 },
    { description: 'Vitals Check', quantity: 1, price: vitalsFee, gstRate: 0 },
    ...(labFee > 0
      ? [
          {
            description: 'Lab Investigation',
            quantity: 1,
            price: labFee,
            gstRate: 18,
          },
        ]
      : []),
    ...(procedureFee > 0
      ? [
          {
            description: 'Minor Procedure',
            quantity: 1,
            price: procedureFee,
            gstRate: 18,
          },
        ]
      : []),
  ];

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const taxTotal = items.reduce(
    (sum, item) =>
      sum + Math.round((item.price * item.quantity * item.gstRate) / 100),
    0,
  );
  const grandTotal = subtotal + taxTotal;

  const taxSummary = items
    .filter((item) => item.gstRate > 0)
    .map((item) => ({
      rate: item.gstRate,
      taxableAmount: item.price * item.quantity,
      taxAmount: Math.round((item.price * item.quantity * item.gstRate) / 100),
    }));

  return {
    appt,
    invoiceId,
    data: {
      appointmentId: appt.id,
      patientId: appt.patientId,
      clinicId,
      invoiceNumber: seedInvoiceNumber(index + 1),
      total: grandTotal,
      subtotal,
      taxTotal,
      grandTotal,
      status: INVOICE_STATUS_PLAN[index] ?? InvoiceStatus.PAID,
      items,
      taxSummary: taxSummary.length > 0 ? taxSummary : undefined,
      placeOfSupplyStateCode: '29',
      reverseCharge: false,
    },
  };
}
