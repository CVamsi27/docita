import { describe, expect, it } from '@jest/globals';
import { InvoiceStatus } from '@workspace/db';
import { RAJESH_APPOINTMENT_ID, RAJESH_INVOICE_ID } from './seed-constants';
import {
  INVOICE_STATUS_PLAN,
  SEED_INVOICE_FINANCIAL_YEAR,
  SEED_INVOICE_PREFIX,
  getSeedInvoiceData,
  seedInvoiceNumber,
} from './seed-invoice-factory';

describe('seed invoice factory', () => {
  it('exposes the 15-entry status plan with the documented mix', () => {
    expect(INVOICE_STATUS_PLAN).toHaveLength(15);
    const paid = INVOICE_STATUS_PLAN.filter(
      (s) => s === InvoiceStatus.PAID,
    ).length;
    const pending = INVOICE_STATUS_PLAN.filter(
      (s) => s === InvoiceStatus.PENDING,
    ).length;
    const overdue = INVOICE_STATUS_PLAN.filter(
      (s) => s === InvoiceStatus.OVERDUE,
    ).length;
    const cancelled = INVOICE_STATUS_PLAN.filter(
      (s) => s === InvoiceStatus.CANCELLED,
    ).length;
    expect(paid).toBe(8);
    expect(pending).toBe(4);
    expect(overdue).toBe(2);
    expect(cancelled).toBe(1);
  });

  it('builds DC{FY}-NNNNNN invoice numbers with the Indian financial year', () => {
    expect(SEED_INVOICE_PREFIX).toBe('DC');
    expect(SEED_INVOICE_FINANCIAL_YEAR).toMatch(/^\d{4}$/);
    expect(seedInvoiceNumber(1)).toBe(
      `DC${SEED_INVOICE_FINANCIAL_YEAR}-000001`,
    );
    expect(seedInvoiceNumber(15)).toBe(
      `DC${SEED_INVOICE_FINANCIAL_YEAR}-000015`,
    );
  });

  it('routes the Rajesh appointment to the canonical Rajesh invoice id', () => {
    const { invoiceId } = getSeedInvoiceData(
      { id: RAJESH_APPOINTMENT_ID, patientId: 'seed-patient-rajesh' },
      'clinic-1',
      0,
    );
    expect(invoiceId).toBe(RAJESH_INVOICE_ID);
  });

  it('derives non-Rajesh invoice ids from the appointment id', () => {
    const { invoiceId } = getSeedInvoiceData(
      { id: 'seed-apt-past-00', patientId: 'seed-patient-priya' },
      'clinic-1',
      1,
    );
    expect(invoiceId).toBe('seed-inv-seed-apt-past-00');
  });

  it('keeps totals internally consistent (grand = subtotal + tax)', () => {
    for (let i = 0; i < 15; i += 1) {
      const { data } = getSeedInvoiceData(
        { id: `seed-apt-${i}`, patientId: 'seed-patient-x' },
        'clinic-1',
        i,
      );
      expect(data.subtotal).toBeGreaterThan(0);
      expect(data.grandTotal).toBe(data.subtotal + data.taxTotal);
      expect(data.total).toBe(data.grandTotal);
      expect(data.invoiceNumber).toBe(seedInvoiceNumber(i + 1));
      expect(data.placeOfSupplyStateCode).toBe('29');
      expect(data.reverseCharge).toBe(false);
      // GST lines (if any) must appear in the tax summary with matching math.
      const gstItems = data.items.filter((item) => item.gstRate > 0);
      if (gstItems.length > 0) {
        expect(data.taxSummary).toBeDefined();
        const summaryTax = (data.taxSummary ?? []).reduce(
          (sum, s) => sum + s.taxAmount,
          0,
        );
        expect(summaryTax).toBe(data.taxTotal);
      }
    }
  });
});
