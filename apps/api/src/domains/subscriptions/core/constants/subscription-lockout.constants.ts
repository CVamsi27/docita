export const SUBSCRIPTION_LOCKOUT_GRACE_DAYS = 10;

export function computeSubscriptionGraceDeadline(
  from: Date = new Date(),
): Date {
  const d = new Date(from.getTime());
  d.setDate(d.getDate() + SUBSCRIPTION_LOCKOUT_GRACE_DAYS);
  return d;
}
