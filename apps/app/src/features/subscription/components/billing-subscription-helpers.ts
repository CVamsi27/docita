import type { SubscriptionLike } from "../lib/billing-subscription-types";
import { formatPlanDate, formatStatusLabel } from "./billing-plan-formatters";

export { formatPlanDate, formatStatusLabel };

export function starterMonthlyAccessTermMismatch(
  subscription: SubscriptionLike | null | undefined,
  daysLeftInPeriod: number | null,
): boolean {
  return (
    subscription?.tier === "STARTER" &&
    subscription?.billingCycle === "MONTHLY" &&
    (daysLeftInPeriod ?? 0) > 45
  );
}

export function formatPlanBillingDetail(
  subscription: SubscriptionLike | null | undefined,
  _status?: string,
): string {
  if (!subscription?.billingCycle) return "Not set";
  const cycle =
    subscription.billingCycle === "MONTHLY" ? "Monthly" : "Yearly";
  return cycle;
}
