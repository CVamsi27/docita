import {
  BILLING_CYCLE_DAYS,
  BILLING_CYCLE_DISPLAY_NAMES,
  BILLING_CYCLE_MONTHLY_DIVISOR,
  BillingCycleEnum,
} from './billing-cycle.policy';
import { InvariantViolationError } from '@/shared/common/errors/domain.errors';

export { BillingCycleEnum } from './billing-cycle.policy';

export class BillingCycle {
  constructor(readonly value: BillingCycleEnum) {}

  static fromString(value: string): BillingCycle {
    const cycle = Object.values(BillingCycleEnum).find((v) => v === value);
    if (!cycle) {
      throw new InvariantViolationError(`Invalid billing cycle: ${value}`);
    }
    return new BillingCycle(cycle);
  }

  isMonthly(): boolean {
    return this.value === BillingCycleEnum.MONTHLY;
  }

  isYearly(): boolean {
    return this.value === BillingCycleEnum.YEARLY;
  }

  isQuarterly(): boolean {
    return this.value === BillingCycleEnum.QUARTERLY;
  }

  isSemiAnnual(): boolean {
    return this.value === BillingCycleEnum.SEMI_ANNUAL;
  }

  getDays(): number {
    return BILLING_CYCLE_DAYS[this.value];
  }

  getDisplayName(): string {
    return BILLING_CYCLE_DISPLAY_NAMES[this.value];
  }

  getMonthlyEquivalent(price: number): number {
    return price / BILLING_CYCLE_MONTHLY_DIVISOR[this.value];
  }

  equals(other: BillingCycle): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
