import { DEFAULT_CURRENCY, formatCurrency } from '@workspace/utils';
import { InvariantViolationError } from '@/shared/common/errors/domain.errors';

export class SubscriptionPrice {
  readonly paise: number;
  readonly currency: string = DEFAULT_CURRENCY;

  constructor(paise: number) {
    if (paise < 0)
      throw new InvariantViolationError('Price cannot be negative');
    if (!Number.isInteger(paise)) {
      throw new InvariantViolationError('Price must be an integer (paise)');
    }
    this.paise = paise;
  }

  getAmount(): number {
    return this.paise / 100;
  }

  add(other: SubscriptionPrice): SubscriptionPrice {
    return new SubscriptionPrice(this.paise + other.paise);
  }

  subtract(other: SubscriptionPrice): SubscriptionPrice {
    return new SubscriptionPrice(Math.max(0, this.paise - other.paise));
  }

  applyDiscount(percentOff: number): SubscriptionPrice {
    if (percentOff < 0 || percentOff > 100)
      throw new InvariantViolationError(
        'Discount percentage must be between 0 and 100',
      );
    const discountedPaise = Math.round(this.paise * ((100 - percentOff) / 100));
    return new SubscriptionPrice(discountedPaise);
  }

  getDiscountAmount(percentOff: number): SubscriptionPrice {
    return this.subtract(this.applyDiscount(percentOff));
  }

  prorate(daysUsed: number, totalCycleDays: number): SubscriptionPrice {
    if (daysUsed < 0 || totalCycleDays <= 0)
      throw new InvariantViolationError('Invalid day values for proration');
    const proratedPaise = Math.round(this.paise * (daysUsed / totalCycleDays));
    return new SubscriptionPrice(proratedPaise);
  }

  format(): string {
    return formatCurrency(this.getAmount(), {
      currency: this.currency,
      fractionDigits: 2,
    });
  }

  equals(other: SubscriptionPrice): boolean {
    return this.paise === other.paise;
  }

  isGreaterThan(other: SubscriptionPrice): boolean {
    return this.paise > other.paise;
  }

  isLessThan(other: SubscriptionPrice): boolean {
    return this.paise < other.paise;
  }

  isZero(): boolean {
    return this.paise === 0;
  }

  toString(): string {
    return `${this.paise}p`;
  }
}
