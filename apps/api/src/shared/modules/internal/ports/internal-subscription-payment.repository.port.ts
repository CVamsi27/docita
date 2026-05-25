export interface MonthlySubscriptionRevenueRow {
  monthStart: Date;
  revenueCents: bigint;
}

export interface InternalSubscriptionPaymentRepository {
  getPaidRevenueGroupedByMonth(
    rangeStart: Date,
    rangeEndExclusive: Date,
  ): Promise<MonthlySubscriptionRevenueRow[]>;
}

export const INTERNAL_SUBSCRIPTION_PAYMENT_REPOSITORY_TOKEN = Symbol(
  'InternalSubscriptionPaymentRepository',
);
