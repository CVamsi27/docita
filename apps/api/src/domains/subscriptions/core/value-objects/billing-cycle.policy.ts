export enum BillingCycleEnum {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  SEMI_ANNUAL = 'SEMI_ANNUAL',
  YEARLY = 'YEARLY',
}

export const BILLING_CYCLE_DAYS: Record<BillingCycleEnum, number> = {
  [BillingCycleEnum.MONTHLY]: 30,
  [BillingCycleEnum.QUARTERLY]: 90,
  [BillingCycleEnum.SEMI_ANNUAL]: 180,
  [BillingCycleEnum.YEARLY]: 365,
};

export const BILLING_CYCLE_DISPLAY_NAMES: Record<BillingCycleEnum, string> = {
  [BillingCycleEnum.MONTHLY]: 'Monthly',
  [BillingCycleEnum.QUARTERLY]: 'Quarterly',
  [BillingCycleEnum.SEMI_ANNUAL]: 'Semi-Annual',
  [BillingCycleEnum.YEARLY]: 'Yearly',
};

export const BILLING_CYCLE_MONTHLY_DIVISOR: Record<BillingCycleEnum, number> = {
  [BillingCycleEnum.MONTHLY]: 1,
  [BillingCycleEnum.QUARTERLY]: 3,
  [BillingCycleEnum.SEMI_ANNUAL]: 6,
  [BillingCycleEnum.YEARLY]: 12,
};
