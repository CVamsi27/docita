import { InvariantViolationError } from '@/shared/common/errors/domain.errors';
import type { DiscountType } from '@workspace/types';

interface DiscountProps {
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
    if (props.percentOff < 0 || props.percentOff > 100)
      throw new InvariantViolationError(
        'Discount percentage must be between 0 and 100',
      );
    this.type = props.type;
    this.percentOff = props.percentOff;
    this.expiresAt = props.expiresAt;
    this.description = props.description;
  }

  isValid(asOf: Date): boolean {
    if (!this.expiresAt) return true;
    return asOf <= this.expiresAt;
  }

  isExpired(asOf: Date): boolean {
    return !this.isValid(asOf);
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

  addDiscount(discount: Discount, asOf: Date): DiscountAggregate {
    if (!discount.isValid(asOf)) {
      throw new InvariantViolationError('Cannot add expired discount');
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

  getActiveDiscounts(asOf: Date): Discount[] {
    return this.discounts.filter((d) => d.isValid(asOf));
  }

  hasDiscount(type: DiscountType, asOf: Date): boolean {
    return this.discounts.some((d) => d.type === type && d.isValid(asOf));
  }

  getDiscount(type: DiscountType, asOf: Date): Discount | null {
    return (
      this.discounts.find((d) => d.type === type && d.isValid(asOf)) || null
    );
  }

  toArray(): Discount[] {
    return [...this.discounts];
  }
}
