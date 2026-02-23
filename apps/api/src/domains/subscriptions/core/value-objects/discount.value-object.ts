/**
 * Discount Value Object
 * Represents a discount (percentage-based) applied to a subscription
 * 
 * Discount types: REFERRAL, ANNUAL, LOYALTY, PROMOTIONAL, etc.
 */

export enum DiscountType {
  REFERRAL = 'REFERRAL',
  ANNUAL = 'ANNUAL',
  LOYALTY = 'LOYALTY',
  PROMOTIONAL = 'PROMOTIONAL',
  PARTNER = 'PARTNER',
  EARLY_BIRD = 'EARLY_BIRD',
}

export interface DiscountProps {
  type: DiscountType;
  percentOff: number; // 0-100
  expiresAt?: Date;
  description?: string;
}

export class Discount {
  readonly type: DiscountType;
  readonly percentOff: number;
  readonly expiresAt?: Date;
  readonly description?: string;

  constructor(props: DiscountProps) {
    if (props.percentOff < 0 || props.percentOff > 100) {
      throw new Error('Discount percentage must be between 0 and 100');
    }
    this.type = props.type;
    this.percentOff = props.percentOff;
    this.expiresAt = props.expiresAt;
    this.description = props.description;
  }

  /**
   * Check if discount is still valid
   */
  isValid(): boolean {
    if (!this.expiresAt) {
      return true;
    }
    return new Date() <= this.expiresAt;
  }

  /**
   * Check if discount has expired
   */
  isExpired(): boolean {
    return !this.isValid();
  }

  equals(other: Discount): boolean {
    return (
      this.type === other.type &&
      this.percentOff === other.percentOff &&
      (this.expiresAt?.getTime() === other.expiresAt?.getTime() ||
        (this.expiresAt === undefined && other.expiresAt === undefined))
    );
  }

  toString(): string {
    return `${this.percentOff}% off (${this.type})`;
  }
}

/**
 * Discount Aggregator
 * Combines multiple discounts into total discount percentage
 * Uses additive model: 10% + 5% = 15% off
 */
export class DiscountAggregate {
  private discounts: Discount[] = [];

  addDiscount(discount: Discount): DiscountAggregate {
    if (!discount.isValid()) {
      throw new Error('Cannot add expired discount');
    }
    this.discounts.push(discount);
    return this;
  }

  removeDiscount(type: DiscountType): DiscountAggregate {
    this.discounts = this.discounts.filter((d) => d.type !== type);
    return this;
  }

  /**
   * Get total discount percentage (capped at 100%)
   * Simple additive model
   */
  getTotalPercent(): number {
    const total = this.discounts.reduce((sum, d) => sum + d.percentOff, 0);
    return Math.min(total, 100);
  }

  /**
   * Get all active discounts
   */
  getActiveDiscounts(): Discount[] {
    return this.discounts.filter((d) => d.isValid());
  }

  /**
   * Check if specific discount type is applied
   */
  hasDiscount(type: DiscountType): boolean {
    return this.discounts.some((d) => d.type === type && d.isValid());
  }

  /**
   * Get discount by type
   */
  getDiscount(type: DiscountType): Discount | null {
    return (
      this.discounts.find((d) => d.type === type && d.isValid()) || null
    );
  }

  toArray(): Discount[] {
    return [...this.discounts];
  }
}
