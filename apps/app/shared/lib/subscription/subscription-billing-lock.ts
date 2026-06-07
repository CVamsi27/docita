import type { Clinic } from "@/lib/contexts/clinic-context";
import { isPastSubscriptionGraceDeadline } from "./subscription-lockout";

function toDateOrNull(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

export function isSubscriptionPeriodLapsed(
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
