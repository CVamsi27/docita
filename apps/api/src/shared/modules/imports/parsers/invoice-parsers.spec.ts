import {
  extractInvoiceTotal,
  extractInvoiceTax,
  extractInvoiceDiscount,
  extractInvoiceSubtotal,
  extractInvoiceItems,
} from './invoice-parsers';
import { createEmptyFields } from './test-helpers';

describe('extractInvoiceTotal', () => {
  it('extracts total amount', () => {
    const fields = createEmptyFields();
    extractInvoiceTotal('Total: 1500.00', fields);
    expect(fields.invoice.total).toBe(1500);
  });

  it('extracts grand total with currency symbol', () => {
    const fields = createEmptyFields();
    extractInvoiceTotal('Grand Total: Rs. 2500', fields);
    expect(fields.invoice.total).toBe(2500);
  });

  it('extracts amount due with comma-separated number', () => {
    const fields = createEmptyFields();
    extractInvoiceTotal('Amount Due: 12,500.00', fields);
    expect(fields.invoice.total).toBe(12500);
  });

  it('does nothing when no total found', () => {
    const fields = createEmptyFields();
    extractInvoiceTotal('No total here', fields);
    expect(fields.invoice.total).toBeNull();
  });
});

describe('extractInvoiceTax', () => {
  it('extracts tax amount', () => {
    const fields = createEmptyFields();
    extractInvoiceTax('Tax: 180', fields);
    expect(fields.invoice.tax).toBe(180);
  });

  it('extracts GST with currency symbol', () => {
    const fields = createEmptyFields();
    extractInvoiceTax('GST: Rs. 360', fields);
    expect(fields.invoice.tax).toBe(360);
  });

  it('does nothing when no tax found', () => {
    const fields = createEmptyFields();
    extractInvoiceTax('No tax here', fields);
    expect(fields.invoice.tax).toBeNull();
  });
});

describe('extractInvoiceDiscount', () => {
  it('extracts discount amount', () => {
    const fields = createEmptyFields();
    extractInvoiceDiscount('Discount: 500', fields);
    expect(fields.invoice.discount).toBe(500);
  });

  it('does nothing when no discount found', () => {
    const fields = createEmptyFields();
    extractInvoiceDiscount('No discount here', fields);
    expect(fields.invoice.discount).toBeNull();
  });
});

describe('extractInvoiceSubtotal', () => {
  it('extracts subtotal amount', () => {
    const fields = createEmptyFields();
    extractInvoiceSubtotal('Subtotal: 3000.00', fields);
    expect(fields.invoice.subtotal).toBe(3000);
  });

  it('does nothing when no subtotal found', () => {
    const fields = createEmptyFields();
    extractInvoiceSubtotal('No subtotal here', fields);
    expect(fields.invoice.subtotal).toBeNull();
  });
});

describe('extractInvoiceItems', () => {
  it('extracts a simple line item', () => {
    const fields = createEmptyFields();
    extractInvoiceItems('Consultation Fee 500', 'consultation fee 500', fields);
    expect(fields.invoice.items).toHaveLength(1);
    expect(fields.invoice.items[0]).toEqual({
      description: 'Consultation Fee',
      quantity: 1,
      unitPrice: 500,
      total: 500,
    });
  });

  it("does not extract items that contain 'total'", () => {
    const fields = createEmptyFields();
    extractInvoiceItems('Total 1500', 'total 1500', fields);
    expect(fields.invoice.items).toHaveLength(0);
  });

  it("does not extract items that contain 'subtotal'", () => {
    const fields = createEmptyFields();
    extractInvoiceItems('Subtotal 1500', 'subtotal 1500', fields);
    expect(fields.invoice.items).toHaveLength(0);
  });

  it("does not extract items that contain 'discount'", () => {
    const fields = createEmptyFields();
    extractInvoiceItems('Discount 100', 'discount 100', fields);
    expect(fields.invoice.items).toHaveLength(0);
  });
});
