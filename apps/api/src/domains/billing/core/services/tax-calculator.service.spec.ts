import { describe, expect, it } from '@jest/globals';
import { TaxCalculatorService } from './tax-calculator.service';

describe('TaxCalculatorService', () => {
  const service = new TaxCalculatorService();

  it('splits same-state India GST into CGST and SGST', () => {
    const result = service.calculateInvoice({
      items: [
        {
          description: 'Taxable device',
          quantity: 1,
          price: 1000,
          taxTreatment: 'TAXABLE',
          taxRate: 18,
          hsnCode: '9018',
        },
      ],
      seller: { stateCode: '29', registrationId: '29ABCDE1234F1Z5' },
      buyer: { stateCode: '29' },
    });

    expect(result.invoiceType).toBe('TAX_INVOICE');
    expect(result.taxTotal).toBe(180);
    expect(result.grandTotal).toBe(1180);
    expect(result.summary.components).toEqual([
      { type: 'CGST', rate: 9, taxableAmount: 1000, amount: 90 },
      { type: 'SGST', rate: 9, taxableAmount: 1000, amount: 90 },
    ]);
  });

  it('uses IGST for inter-state India GST', () => {
    const result = service.calculateInvoice({
      items: [
        {
          description: 'Taxable device',
          quantity: 2,
          price: 500,
          taxTreatment: 'TAXABLE',
          taxRate: 12,
        },
      ],
      seller: { stateCode: '29' },
      buyer: { stateCode: '27' },
    });

    expect(result.summary.components).toEqual([
      { type: 'IGST', rate: 12, taxableAmount: 1000, amount: 120 },
    ]);
    expect(result.grandTotal).toBe(1120);
  });

  it('defaults healthcare service lines to exempt bill of supply', () => {
    const result = service.calculateInvoice({
      items: [{ description: 'Consultation', quantity: 1, price: 750 }],
      seller: { stateCode: '29' },
    });

    expect(result.invoiceType).toBe('BILL_OF_SUPPLY');
    expect(result.taxTotal).toBe(0);
    expect(result.summary.exemptAmount).toBe(750);
    expect(result.items[0].taxTreatment).toBe('EXEMPT_HEALTHCARE');
  });

  it('handles mixed taxable and exempt lines with discounts', () => {
    const result = service.calculateInvoice({
      items: [
        {
          description: 'Consultation',
          quantity: 1,
          price: 500,
        },
        {
          description: 'Taxable device',
          quantity: 1,
          price: 1000,
          discountRate: 10,
          taxTreatment: 'TAXABLE',
          taxRate: 18,
        },
      ],
      seller: { stateCode: '29' },
      buyer: { stateCode: '29' },
    });

    expect(result.subtotal).toBe(1500);
    expect(result.discountTotal).toBe(100);
    expect(result.summary.taxableAmount).toBe(900);
    expect(result.summary.exemptAmount).toBe(500);
    expect(result.taxTotal).toBe(162);
    expect(result.grandTotal).toBe(1562);
  });

  it('preserves reverse-charge metadata while calculating line tax', () => {
    const result = service.calculateInvoice({
      reverseCharge: true,
      items: [
        {
          description: 'Taxable service',
          quantity: 1,
          price: 100,
          taxTreatment: 'TAXABLE',
          taxRate: 18,
        },
      ],
      seller: { stateCode: '29' },
      buyer: { stateCode: '27' },
    });

    expect(result.summary.reverseCharge).toBe(true);
    expect(result.taxTotal).toBe(18);
  });
});
