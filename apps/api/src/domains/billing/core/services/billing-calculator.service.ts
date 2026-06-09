import { Money } from '@/domains/billing/core/value-objects/money.value-object';
import { InvoiceItem } from '@/domains/billing/core/entities/invoice-item.entity';
import { DEFAULT_CURRENCY } from '@workspace/utils';
import { InvariantViolationError } from '@/shared/common/errors/domain.errors';

export interface TaxConfiguration {
  rate: number;
  name: string;
  description?: string;
}

export interface DiscountConfiguration {
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  description?: string;
}

export class BillingCalculatorService {
  calculateTax(amount: Money, taxRate: number): Money {
    if (taxRate < 0 || taxRate > 100)
      throw new InvariantViolationError('Tax rate must be between 0 and 100');
    const taxAmount = (amount.amount * taxRate) / 100;
    return new Money(Math.round(taxAmount * 100) / 100, amount.currency);
  }

  calculateDiscount(amount: Money, discount: DiscountConfiguration): Money {
    let discountAmount: number;

    if (discount.type === 'PERCENTAGE') {
      if (discount.value < 0 || discount.value > 100)
        throw new InvariantViolationError(
          'Discount percentage must be between 0 and 100',
        );
      discountAmount = (amount.amount * discount.value) / 100;
    } else {
      if (discount.value < 0)
        throw new InvariantViolationError('Fixed discount cannot be negative');
      if (discount.value > amount.amount)
        throw new InvariantViolationError(
          'Fixed discount cannot exceed amount',
        );
      discountAmount = discount.value;
    }

    return new Money(Math.round(discountAmount * 100) / 100, amount.currency);
  }

  calculateItemsTotal(items: InvoiceItem[]): Money {
    if (items.length === 0)
      throw new InvariantViolationError('No items to calculate');

    return items
      .map((item) => item.getTotal())
      .reduce((acc, itemTotal) => acc.add(itemTotal));
  }

  calculateItemsSubtotal(items: InvoiceItem[]): Money {
    if (items.length === 0)
      throw new InvariantViolationError('No items to calculate');

    return items
      .map((item) => item.getSubtotal())
      .reduce((acc, itemSubtotal) => acc.add(itemSubtotal));
  }

  calculateTotalTax(items: InvoiceItem[]): Money {
    if (items.length === 0) return new Money(0, DEFAULT_CURRENCY);

    return items
      .map((item) => item.getTaxAmount())
      .reduce((acc, itemTax) => acc.add(itemTax));
  }

  calculateTotalDiscount(items: InvoiceItem[]): Money {
    if (items.length === 0) return new Money(0, DEFAULT_CURRENCY);

    return items
      .map((item) => item.getDiscountAmount())
      .reduce((acc, itemDiscount) => acc.add(itemDiscount));
  }

  roundToNearestPaisa(amount: Money): Money {
    const rounded = Math.round(amount.amount * 100) / 100;
    return new Money(rounded, amount.currency);
  }
}
