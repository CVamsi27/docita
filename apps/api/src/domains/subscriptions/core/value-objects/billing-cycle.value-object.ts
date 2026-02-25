export enum BillingCycleEnum {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  SEMI_ANNUAL = 'SEMI_ANNUAL',
  YEARLY = 'YEARLY',
}

export class BillingCycle {
  constructor(readonly value: BillingCycleEnum) {}

  static fromString(value: string): BillingCycle {
    const cycle = Object.values(BillingCycleEnum).find(
      (v) => (v as string) === value,
    );
    if (!cycle) {
      throw new Error(`Invalid billing cycle: ${value}`);
    }
    return new BillingCycle(cycle as BillingCycleEnum);
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
    switch (this.value) {
      case BillingCycleEnum.YEARLY:
        return 365;
      case BillingCycleEnum.SEMI_ANNUAL:
        return 180;
      case BillingCycleEnum.QUARTERLY:
        return 90;
      default:
        return 30;
    }
  }

  getDisplayName(): string {
    switch (this.value) {
      case BillingCycleEnum.YEARLY:
        return 'Yearly';
      case BillingCycleEnum.SEMI_ANNUAL:
        return 'Semi-Annual';
      case BillingCycleEnum.QUARTERLY:
        return 'Quarterly';
      default:
        return 'Monthly';
    }
  }

  getMonthlyEquivalent(price: number): number {
    switch (this.value) {
      case BillingCycleEnum.YEARLY:
        return price / 12;
      case BillingCycleEnum.SEMI_ANNUAL:
        return price / 6;
      case BillingCycleEnum.QUARTERLY:
        return price / 3;
      default:
        return price;
    }
  }

  equals(other: BillingCycle): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
