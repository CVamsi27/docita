// jscpd:ignore-start
import { TRIAL_GRACE_DAYS } from "@workspace/types";
import type { Clinic } from "@/lib/contexts/clinic-context";

const DAY_MS = 24 * 60 * 60 * 1000;

function toDateOrNull(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

export type TrialState = "ACTIVE" | "GRACE" | "EXPIRED";

export function getTrialState(
// jscpd:ignore-end
  clinic: Pick<Clinic, "subscriptionStatus" | "trialEndsAt"> | null | undefined,
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
