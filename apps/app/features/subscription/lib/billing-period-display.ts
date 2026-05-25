const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** When MONTHLY billing spans longer than a normal month, treat display as one month from period start (calendar month length via Date#setMonth). */
const MAX_MONTHLY_PERIOD_SPAN_DAYS = 40;

export type SubscriptionPeriodDisplayInput = {
  billingCycle?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
};

/**
 * For ACTIVE MONTHLY subscriptions whose DB period is anomalously long (e.g.
 * legacy access windows), align the renewal date and "days left" with the
 * first billing month from {@link currentPeriodStart}.
 */
export function getDisplayBillingPeriodEndAndDaysLeft(
  subscription: SubscriptionPeriodDisplayInput | null | undefined,
): { periodEnd: Date; daysLeft: number } | null {
  if (!subscription?.currentPeriodEnd) return null;
  const end = new Date(subscription.currentPeriodEnd);
  if (Number.isNaN(end.getTime())) return null;

  let effectiveEnd = end;
  if (
    subscription.billingCycle === "MONTHLY" &&
    subscription.currentPeriodStart
  ) {
    const start = new Date(subscription.currentPeriodStart);
    if (!Number.isNaN(start.getTime())) {
      const spanDays = Math.ceil(
        (end.getTime() - start.getTime()) / MS_PER_DAY,
      );
      if (spanDays > MAX_MONTHLY_PERIOD_SPAN_DAYS) {
        const nominal = new Date(start);
        nominal.setMonth(nominal.getMonth() + 1);
        effectiveEnd = new Date(
          Math.min(end.getTime(), nominal.getTime()),
        );
      }
    }
  }

  const daysLeft = Math.max(
    0,
    Math.ceil((effectiveEnd.getTime() - Date.now()) / MS_PER_DAY),
  );
  return { periodEnd: effectiveEnd, daysLeft };
}
