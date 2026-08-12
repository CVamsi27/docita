/**
 * Shared subscription shape consumed by billing display helpers
 * (components + lib + hooks). Lives in lib/ so helper layers never import
 * from hooks/ or components/ (prevents the subscription import cycle).
 */
export interface SubscriptionLike {
  subscriptionStatus?: string;
  currentPeriodEnd?: string | null;
  currentPeriodStart?: string | null;
  daysRemaining?: number | null;
  trialWindowState?: string | null;
  hasOutstandingPendingPayment?: boolean;
  billingCycle?: "MONTHLY" | "YEARLY";
  billingPeriod?: string;
  basePriceCents?: number;
  currency?: string;
  tier?: string;
  cancelAtPeriodEnd?: boolean;
}
