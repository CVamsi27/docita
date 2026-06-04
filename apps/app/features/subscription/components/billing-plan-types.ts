export interface SubscriptionBillingSummary {
  tier?: string;
  billingCycle?: "MONTHLY" | "YEARLY" | string;
  basePriceCents?: number;
  currency?: string;
}
