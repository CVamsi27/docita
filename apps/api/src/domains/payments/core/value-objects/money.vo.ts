export class Money {
  constructor(
    public readonly amount: number,
    public readonly currency: string = 'INR',
  ) {
    if (amount < 0) {
      throw new Error('Money amount cannot be negative');
    }
  }

  toCents(): number {
    return Math.round(this.amount * 100);
  }

  static fromCents(cents: number, currency: string = 'INR'): Money {
    return new Money(cents / 100, currency);
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  toString(): string {
    return `${this.currency} ${this.amount.toFixed(2)}`;
  }
}
