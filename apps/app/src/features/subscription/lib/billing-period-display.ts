import type { SubscriptionLike } from "./billing-subscription-types";

export function getDisplayBillingPeriodEndAndDaysLeft(
  subscription: SubscriptionLike | null | undefined,
): { periodEnd: Date | null; daysLeft: number | null } {
  if (!subscription?.currentPeriodEnd) {
    return { periodEnd: null, daysLeft: null };
  }
  const periodEnd = new Date(subscription.currentPeriodEnd);
  const now = new Date();
  const diffTime = periodEnd.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  return { periodEnd, daysLeft };
}
