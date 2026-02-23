/**
 * Subscription Price Value Object
 * Represents pricing in paise (cents) to avoid floating point issues
 * All prices stored as integers (paise)
 * 
 * @example
 * const price = new SubscriptionPrice(99900); // ₹999.00
 * price.displayAmount(); // "999.00"
 * price.add(new SubscriptionPrice(1000)); // ₹1,000.00
 */

export class SubscriptionPrice {
  readonly paise: number; // Amount in paise (cents)
  readonly currency: string = 'INR';

  constructor(paise: number) {
    if (paise < 0) {
      throw new Error('Price cannot be negative');
    }
    if (!Number.isInteger(paise)) {
      throw new Error('Price must be an integer (paise)');
    }
    this.paise = paise;
  }

  /**
   * Get the amount in rupees (for display)
   */
  getAmount(): number {
    return this.paise / 100;
  }

  /**
   * Add another price
   */
  add(other: SubscriptionPrice): SubscriptionPrice {
    return new SubscriptionPrice(this.paise + other.paise);
  }

  /**
   * Subtract another price
   */
  subtract(other: SubscriptionPrice): SubscriptionPrice {
    return new SubscriptionPrice(Math.max(0, this.paise - other.paise));
  }

  /**
   * Apply a discount percentage
   */
  applyDiscount(percentOff: number): SubscriptionPrice {
    if (percentOff < 0 || percentOff > 100) {
      throw new Error('Discount percentage must be between 0 and 100');
    }
    const discountedPaise = Math.round(
      this.paise * ((100 - percentOff) / 100),
    );
    return new SubscriptionPrice(discountedPaise);
  }

  /**
   * Calculate discount amount
   */
  getDiscountAmount(percentOff: number): SubscriptionPrice {
    return this.subtract(this.applyDiscount(percentOff));
  }

  /**
   * Prorate price for given days vs. total cycle days
   */
  prorate(daysUsed: number, totalCycleDays: number): SubscriptionPrice {
    if (daysUsed < 0 || totalCycleDays <= 0) {
      throw new Error('Invalid day values for proration');
    }
    const proratedPaise = Math.round(
      this.paise * (daysUsed / totalCycleDays),
    );
    return new SubscriptionPrice(proratedPaise);
  }

  /**
   * Format for display (e.g., "₹999.00")
   */
  format(): string {
    return `₹${this.getAmount().toFixed(2)}`;
  }

  /**
   * Compare prices
   */
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
