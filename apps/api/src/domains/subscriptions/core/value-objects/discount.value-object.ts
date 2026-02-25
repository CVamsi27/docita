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
  percentOff: number;
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

  isValid(): boolean {
    if (!this.expiresAt) {
      return true;
    }
    return new Date() <= this.expiresAt;
  }

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

  getTotalPercent(): number {
    const total = this.discounts.reduce((sum, d) => sum + d.percentOff, 0);
    return Math.min(total, 100);
  }

  getDiscounts(): Discount[] {
    return [...this.discounts];
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
    return this.discounts.find((d) => d.type === type && d.isValid()) || null;
  }

  toArray(): Discount[] {
    return [...this.discounts];
  }
}
