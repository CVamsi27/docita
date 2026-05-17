import type { Clinic } from "@/lib/clinic-context";
import { TRIAL_GRACE_DAYS } from "@workspace/types";

const DAY_MS = 24 * 60 * 60 * 1000;

function subscriptionGraceUntilToDate(value: unknown): Date | null {
  if (value == null) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
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
): boolean {
  if (!clinic) {
    return false;
  }
  const until = subscriptionGraceUntilToDate(clinic.subscriptionGraceUntil);
  if (!until) {
    return false;
  }
  const status = clinic.subscriptionStatus;
  if (status !== "GRACE" && status !== "PAST_DUE") {
    return false;
  }
  return Date.now() > until.getTime();
}

export function isBillingAdminRole(role: string | undefined): boolean {
  return role === "ADMIN" || role === "ADMIN_DOCTOR";
}
