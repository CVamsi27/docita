import { describe, expect, it } from '@jest/globals';
import { InvoiceItem } from './invoice-item.entity';
import { Money } from '@/domains/billing/core/value-objects/money.value-object';
import { InvariantViolationError } from '@/shared/common/errors/domain.errors';

function build(
  overrides: Partial<{
    quantity: number;
    unitPrice: number;
    taxRate: number;
    discount: number;
  }> = {},
) {
  return new InvoiceItem({
    id: 'i1',
    invoiceId: 'inv1',
    description: 'Item',
    quantity: overrides.quantity ?? 2,
    unitPrice: new Money(overrides.unitPrice ?? 100, 'INR'),
    taxRate: overrides.taxRate ?? 18,
    discount: overrides.discount ?? 10,
  });
}

describe('InvoiceItem', () => {
  it('rejects invalid quantity / taxRate / discount at construction', () => {
    expect(() => build({ quantity: 0 })).toThrow(InvariantViolationError);
    expect(() => build({ taxRate: 200 })).toThrow(InvariantViolationError);
    expect(() => build({ discount: 200 })).toThrow(InvariantViolationError);
  });

  it('defaults discount to 0 when omitted', () => {
    const noDiscount = new InvoiceItem({
      id: 'i1',
      invoiceId: 'inv1',
      description: 'Item',
      quantity: 1,
      unitPrice: new Money(100, 'INR'),
      taxRate: 0,
    });
    expect(noDiscount.discount).toBe(0);
    expect(noDiscount.getDiscountAmount().amount).toBe(0);
  });

  it('computes subtotal, discount, amount, tax (on net), and total', () => {
    const item = build({
      quantity: 2,
      unitPrice: 100,
      taxRate: 18,
      discount: 10,
    });
    // subtotal = 200, discount = 20, amount = 180, tax = 180*18% = 32.4, total = 212.4
    expect(item.getSubtotal()).toEqual(new Money(200, 'INR'));
    expect(item.getDiscountAmount()).toEqual(new Money(20, 'INR'));
    expect(item.getAmount()).toEqual(new Money(180, 'INR'));
    expect(item.getTaxAmount().amount).toBeCloseTo(32.4);
    expect(item.getTotal().amount).toBeCloseTo(212.4);
  });
});
