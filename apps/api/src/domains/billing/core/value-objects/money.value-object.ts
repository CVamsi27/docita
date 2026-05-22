import { DEFAULT_CURRENCY } from '@workspace/utils';
import { InvariantViolationError } from '@/shared/common/errors/domain.errors';

export class Money {
  constructor(
    readonly amount: number,
    readonly currency: string = DEFAULT_CURRENCY,
  ) {
    if (amount < 0) {
      throw new InvariantViolationError('Amount cannot be negative');
    }
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new InvariantViolationError(
        `Cannot add ${other.currency} to ${this.currency}`,
      );
    }
    return new Money(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new InvariantViolationError(
        `Cannot subtract ${other.currency} from ${this.currency}`,
      );
    }
    const result = this.amount - other.amount;
    if (result < 0) {
      throw new InvariantViolationError('Result cannot be negative');
    }
    return new Money(result, this.currency);
  }

  multiply(factor: number): Money {
    if (factor < 0) {
      throw new InvariantViolationError('Factor cannot be negative');
    }
    return new Money(this.amount * factor, this.currency);
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  isGreaterThan(other: Money): boolean {
    if (this.currency !== other.currency) {
      throw new InvariantViolationError('Cannot compare different currencies');
    }
    return this.amount > other.amount;
  }

  isLessThan(other: Money): boolean {
    if (this.currency !== other.currency) {
      throw new InvariantViolationError('Cannot compare different currencies');
    }
    return this.amount < other.amount;
  }
}
