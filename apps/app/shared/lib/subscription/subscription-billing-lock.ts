// jscpd:ignore-start
import type { Clinic } from "@/lib/contexts/clinic-context";
import { isPastSubscriptionGraceDeadline } from "./subscription-lockout";
import { toDateOrNull } from "./subscription-date-utils";

export function isSubscriptionPeriodLapsed(
// jscpd:ignore-end
  currentPeriodEnd: string | Date | null | undefined,
  now: number = Date.now(),
): boolean {
  const end = toDateOrNull(currentPeriodEnd);
  if (!end) return false;
  return now >= end.getTime();
}

export function isRenewalUnpaidWithOutstandingPending(params: {
  hasOutstandingPendingPayment: boolean;
  currentPeriodEnd: string | Date | null | undefined;
  now?: number;
}): boolean {
  if (!params.hasOutstandingPendingPayment) return false;
  return isSubscriptionPeriodLapsed(
    params.currentPeriodEnd,
    params.now ?? Date.now(),
  );
}

export function isSubscriptionBillingHardLocked(
  clinic:
    | Pick<Clinic, "subscriptionStatus" | "subscriptionGraceUntil">
    | null
    | undefined,
  billing: {
    hasOutstandingPendingPayment?: boolean;
    currentPeriodEnd?: string | null;
  } | null | undefined,
  now: number = Date.now(),
): boolean {
  if (isPastSubscriptionGraceDeadline(clinic, now)) return true;
  return isRenewalUnpaidWithOutstandingPending({ hasOutstandingPendingPayment: billing?.hasOutstandingPendingPayment === true, currentPeriodEnd: billing?.currentPeriodEnd ?? null, now });
}
