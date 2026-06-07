// check-as-cast-density: allow-file — narrowing casts required by generic signatures or external types
import type { Clinic } from "@/lib/contexts/clinic-context";
import { BILLING_ROLES } from "@workspace/types";

export type { TrialState } from "./subscription-trial-state";
export { getTrialState, getTrialGraceEndsAt } from "./subscription-trial-state";

function subscriptionGraceUntilToDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
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

export function isBillingAdminRole(role: string | undefined): boolean {
  return typeof role === "string" ? BILLING_ROLES.has(role as never) : false;
}
