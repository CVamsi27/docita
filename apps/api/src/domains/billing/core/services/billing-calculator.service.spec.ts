import { describe, expect, it } from '@jest/globals';
import { BillingCalculatorService } from './billing-calculator.service';
import { Money } from '@/domains/billing/core/value-objects/money.value-object';
import { InvoiceItem } from '@/domains/billing/core/entities/invoice-item.entity';
import { InvariantViolationError } from '@/shared/common/errors/domain.errors';

function item(
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
    description: 'Consultation',
    quantity: overrides.quantity ?? 1,
    unitPrice: new Money(overrides.unitPrice ?? 100, 'INR'),
    taxRate: overrides.taxRate ?? 0,
    discount: overrides.discount ?? 0,
  });
}

describe('BillingCalculatorService', () => {
  const svc = new BillingCalculatorService();

  describe('calculateTax', () => {
    it('computes tax at the given rate', () => {
      expect(svc.calculateTax(new Money(200, 'INR'), 18)).toEqual(
        new Money(36, 'INR'),
      );
    });
    it('rejects rates outside 0–100', () => {
      expect(() => svc.calculateTax(new Money(100, 'INR'), -1)).toThrow(
        InvariantViolationError,
      );
      expect(() => svc.calculateTax(new Money(100, 'INR'), 101)).toThrow(
        InvariantViolationError,
      );
    });
  });

  describe('calculateDiscount', () => {
    it('applies a percentage discount', () => {
      expect(
        svc.calculateDiscount(new Money(200, 'INR'), {
          type: 'PERCENTAGE',
          value: 10,
        }),
      ).toEqual(new Money(20, 'INR'));
    });
    it('rejects an out-of-range percentage', () => {
      expect(() =>
        svc.calculateDiscount(new Money(200, 'INR'), {
          type: 'PERCENTAGE',
          value: 150,
        }),
      ).toThrow(InvariantViolationError);
    });
    it('applies a fixed discount', () => {
      expect(
        svc.calculateDiscount(new Money(200, 'INR'), {
          type: 'FIXED',
          value: 50,
        }),
      ).toEqual(new Money(50, 'INR'));
    });
    it('rejects a negative or too-large fixed discount', () => {
      expect(() =>
        svc.calculateDiscount(new Money(200, 'INR'), {
          type: 'FIXED',
          value: -1,
        }),
      ).toThrow(/cannot be negative/);
      expect(() =>
        svc.calculateDiscount(new Money(200, 'INR'), {
          type: 'FIXED',
          value: 500,
        }),
      ).toThrow(/cannot exceed amount/);
    });
  });

  describe('item aggregation', () => {
    it('sums item totals and subtotals', () => {
      const items = [item({ unitPrice: 100 }), item({ unitPrice: 50 })];
      expect(svc.calculateItemsSubtotal(items)).toEqual(new Money(150, 'INR'));
      expect(svc.calculateItemsTotal(items)).toEqual(new Money(150, 'INR'));
    });
    it('throws when there are no items to total', () => {
      expect(() => svc.calculateItemsTotal([])).toThrow(
        InvariantViolationError,
      );
      expect(() => svc.calculateItemsSubtotal([])).toThrow(
        InvariantViolationError,
      );
    });
    it('sums tax and discount, returning zero for empty lists', () => {
      const items = [item({ unitPrice: 100, taxRate: 18, discount: 10 })];
      expect(svc.calculateTotalTax(items).amount).toBeCloseTo(16.2);
      expect(svc.calculateTotalDiscount(items)).toEqual(new Money(10, 'INR'));
      expect(svc.calculateTotalTax([]).amount).toBe(0);
      expect(svc.calculateTotalDiscount([]).amount).toBe(0);
    });
  });

  it('roundToNearestPaisa rounds to two decimals', () => {
    expect(svc.roundToNearestPaisa(new Money(10.126, 'INR')).amount).toBe(
      10.13,
    );
  });
});
