/**
 * Billing Cycle Value Object
 * Represents billing frequency: MONTHLY or YEARLY
 * Includes calculation helpers for cycle-based operations
 */

export enum BillingCycleEnum {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export class BillingCycle {
  constructor(readonly value: BillingCycleEnum) {}

  isMonthly(): boolean {
    return this.value === BillingCycleEnum.MONTHLY;
  }

  isYearly(): boolean {
    return this.value === BillingCycleEnum.YEARLY;
  }

  /**
   * Get the duration in days for this cycle
   */
  getDays(): number {
    return this.isYearly() ? 365 : 30;
  }

  /**
   * Get the display name
   */
  getDisplayName(): string {
    return this.isYearly() ? 'Yearly' : 'Monthly';
  }

  /**
   * Calculate annual equivalent for pricing
   * (e.g., if monthly is $100, yearly with discount might be $1,200 instead of $1,200)
   */
  getMonthlyEquivalent(yearlyPrice: number): number {
    return this.isYearly() ? yearlyPrice / 12 : yearlyPrice;
  }

  equals(other: BillingCycle): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
