import type { Clinic } from "@/lib/clinic-context";

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
