"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { useClinic } from "@/lib/contexts/clinic-context";
import { useSubscription } from "@workspace/data-access";
import {
  getTrialState,
  isBillingAdminRole,
  isSubscriptionBillingHardLocked,
} from "@/lib/subscription/subscription-lockout";
import { SUBSCRIPTION_BILLING_RESOLVE_PATH } from "@/lib/subscription/subscription-settings-path";

const SUBSCRIPTION_ALLOWED_PATHS = ["/settings", "/login", "/billing-locked"];

export function SubscriptionGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { clinic } = useClinic();
  const { user } = useAuth();
  const { data: subscription } = useSubscription({
    enabled: Boolean(clinic?.id),
  });
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!clinic) return;
    const billingLocked = isSubscriptionBillingHardLocked(clinic, {
      hasOutstandingPendingPayment:
        subscription?.hasOutstandingPendingPayment === true,
      currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
    });
    const billingAdmin = isBillingAdminRole(user?.role);
    const trialState = getTrialState(clinic);
    const trialFullyExpired = trialState === "EXPIRED";

    if (
      (billingLocked || trialFullyExpired) &&
      !billingAdmin &&
      !pathname?.startsWith("/billing-locked") &&
      !pathname?.startsWith("/login")
    ) {
      router.replace("/billing-locked");
      return;
    }

    if (
      billingLocked &&
      billingAdmin &&
      !SUBSCRIPTION_ALLOWED_PATHS.some((p) => pathname?.startsWith(p))
    ) {
      router.replace(SUBSCRIPTION_BILLING_RESOLVE_PATH);
      return;
    }

    const status = clinic.subscriptionStatus;
    const isExpired = status === "EXPIRED";
    const isBlocked = isExpired || trialFullyExpired;
    if (
      isBlocked &&
      !SUBSCRIPTION_ALLOWED_PATHS.some((p) => pathname?.startsWith(p))
    ) {
      router.replace(SUBSCRIPTION_BILLING_RESOLVE_PATH);
    }
  }, [clinic, pathname, router, subscription, user?.role]);

  return <>{children}</>;
}
