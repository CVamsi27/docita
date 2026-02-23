/**
 * Billing Period Value Object
 * Handles start and end dates with validation
 */

export class BillingPeriod {
  constructor(
    readonly startDate: Date,
    readonly endDate: Date,
  ) {
    if (startDate >= endDate) {
      throw new Error('Start date must be before end date');
    }
  }

  contains(date: Date): boolean {
    return date >= this.startDate && date <= this.endDate;
  }

  getDays(): number {
    const timeDiff = this.endDate.getTime() - this.startDate.getTime();
    return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  }

  overlappsWith(other: BillingPeriod): boolean {
    return this.startDate < other.endDate && this.endDate > other.startDate;
  }

  equals(other: BillingPeriod): boolean {
    return (
      this.startDate.getTime() === other.startDate.getTime() &&
      this.endDate.getTime() === other.endDate.getTime()
    );
  }

  toString(): string {
    return `${this.startDate.toISOString().split('T')[0]} to ${this.endDate.toISOString().split('T')[0]}`;
  }
}
