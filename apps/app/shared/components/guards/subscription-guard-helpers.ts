import type { Clinic } from "@/lib/contexts/clinic-context";
import {
  getTrialState,
  isBillingAdminRole,
} from "@/lib/subscription/subscription-lockout";
import { isSubscriptionBillingHardLocked } from "@/lib/subscription/subscription-billing-lock";
import { SUBSCRIPTION_BILLING_RESOLVE_PATH } from "@/lib/subscription/subscription-settings-path";

export const SUBSCRIPTION_ALLOWED_PATHS = ["/settings", "/login", "/billing-locked"] as const;

interface SubscriptionGuardSubscription {
  hasOutstandingPendingPayment?: boolean;
  currentPeriodEnd?: string | null;
}

type SubscriptionGuardClinic = Pick<
  Clinic,
  "subscriptionStatus" | "subscriptionGraceUntil" | "trialEndsAt"
>;

/** Returns the path the subscription guard should redirect to, or null if the route is allowed. */
export function resolveSubscriptionGuardRedirect({
  clinic,
  subscription,
  userRole,
  pathname,
}: {
  clinic: SubscriptionGuardClinic | null | undefined;
  subscription: SubscriptionGuardSubscription | null | undefined;
  userRole: string | undefined;
  pathname: string | null | undefined;
}): string | null {
  if (!clinic) return null;

  const billingLocked = isSubscriptionBillingHardLocked(clinic, {
    hasOutstandingPendingPayment: subscription?.hasOutstandingPendingPayment === true,
    currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
  });
  const billingAdmin = isBillingAdminRole(userRole);
  const trialFullyExpired = getTrialState(clinic) === "EXPIRED";

  if (
    (billingLocked || trialFullyExpired) &&
    !billingAdmin &&
    !pathname?.startsWith("/billing-locked") &&
    !pathname?.startsWith("/login")
  ) {
    return "/billing-locked";
  }

  if (
    billingLocked &&
    billingAdmin &&
    !SUBSCRIPTION_ALLOWED_PATHS.some((p) => pathname?.startsWith(p))
  ) {
    return SUBSCRIPTION_BILLING_RESOLVE_PATH;
  }

  const isExpired = clinic.subscriptionStatus === "EXPIRED";
  const isBlocked = isExpired || trialFullyExpired;
  if (isBlocked && !SUBSCRIPTION_ALLOWED_PATHS.some((p) => pathname?.startsWith(p))) {
    return SUBSCRIPTION_BILLING_RESOLVE_PATH;
  }

  return null;
}
