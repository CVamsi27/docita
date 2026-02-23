/**
 * Money Value Object - Handles currency and amount
 * Ensures type safety and prevents accidental currency mixing
 */

export class Money {
  constructor(
    readonly amount: number,
    readonly currency: string = 'INR',
  ) {
    if (amount < 0) {
      throw new Error('Amount cannot be negative');
    }
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error(`Cannot add ${other.currency} to ${this.currency}`);
    }
    return new Money(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error(
        `Cannot subtract ${other.currency} from ${this.currency}`,
      );
    }
    const result = this.amount - other.amount;
    if (result < 0) {
      throw new Error('Result cannot be negative');
    }
    return new Money(result, this.currency);
  }

  multiply(factor: number): Money {
    if (factor < 0) {
      throw new Error('Factor cannot be negative');
    }
    return new Money(this.amount * factor, this.currency);
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  isGreaterThan(other: Money): boolean {
    if (this.currency !== other.currency) {
      throw new Error('Cannot compare different currencies');
    }
    return this.amount > other.amount;
  }

  isLessThan(other: Money): boolean {
    if (this.currency !== other.currency) {
      throw new Error('Cannot compare different currencies');
    }
    return this.amount < other.amount;
  }
}
