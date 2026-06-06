// check-as-cast-density: allow-file — narrowing casts required by generic signatures or external types
import type { Clinic } from "@/lib/contexts/clinic-context";
import { TRIAL_GRACE_DAYS, BILLING_ROLES } from "@workspace/types";

const DAY_MS = 24 * 60 * 60 * 1000;

function subscriptionGraceUntilToDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function toDateOrNull(value: unknown): Date | null {
  return subscriptionGraceUntilToDate(value);
}

export type TrialState = "ACTIVE" | "GRACE" | "EXPIRED";

export function getTrialState(
  clinic:
    | Pick<Clinic, "subscriptionStatus" | "trialEndsAt">
    | null
    | undefined,
): TrialState | null {
  if (!clinic) return null;
  if (clinic.subscriptionStatus !== "TRIALING") return null;
  const trialEnd = toDateOrNull(clinic.trialEndsAt);
  if (!trialEnd) return "ACTIVE";
  const now = Date.now();
  if (now < trialEnd.getTime()) return "ACTIVE";
  if (now < trialEnd.getTime() + TRIAL_GRACE_DAYS * DAY_MS) return "GRACE";
  return "EXPIRED";
}

export function getTrialGraceEndsAt(
  clinic: Pick<Clinic, "trialEndsAt"> | null | undefined,
): Date | null {
  const trialEnd = toDateOrNull(clinic?.trialEndsAt);
  if (!trialEnd) return null;
  return new Date(trialEnd.getTime() + TRIAL_GRACE_DAYS * DAY_MS);
}

export function isPastSubscriptionGraceDeadline(
  clinic:
    | Pick<Clinic, "subscriptionStatus" | "subscriptionGraceUntil">
    | null
    | undefined,
  now: number = Date.now(),
): boolean {
  if (!clinic) return false;
  const until = subscriptionGraceUntilToDate(clinic.subscriptionGraceUntil);
  if (!until) return false;
  const status = clinic.subscriptionStatus;
  if (status !== "GRACE" && status !== "PAST_DUE") return false;
  return now > until.getTime();
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

export function isBillingAdminRole(role: string | undefined): boolean {
  return typeof role === "string" ? BILLING_ROLES.has(role as never) : false;
}
