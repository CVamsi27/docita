"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { useClinic } from "@/lib/contexts/clinic-context";
import {
  getTrialState,
  isBillingAdminRole,
  isPastSubscriptionGraceDeadline,
} from "@/lib/subscription/subscription-lockout";
import { SUBSCRIPTION_SETTINGS_PATH } from "@/lib/subscription/subscription-settings-path";

const SUBSCRIPTION_ALLOWED_PATHS = ["/settings", "/login", "/billing-locked"];

export function SubscriptionGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { clinic } = useClinic();
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!clinic) return;
    const pastGrace = isPastSubscriptionGraceDeadline(clinic);
    const billingAdmin = isBillingAdminRole(user?.role);
    const trialState = getTrialState(clinic);
    const trialFullyExpired = trialState === "EXPIRED";

    if (
      (pastGrace || trialFullyExpired) &&
      !billingAdmin &&
      !pathname?.startsWith("/billing-locked") &&
      !pathname?.startsWith("/login")
    ) {
      router.replace("/billing-locked");
      return;
    }

    const status = clinic.subscriptionStatus;
    const isExpired = status === "EXPIRED";
    const isBlocked = isExpired || trialFullyExpired;
    if (
      isBlocked &&
      !SUBSCRIPTION_ALLOWED_PATHS.some((p) => pathname?.startsWith(p))
    ) {
      router.replace(SUBSCRIPTION_SETTINGS_PATH);
    }
  }, [clinic, pathname, router, user?.role]);

  return <>{children}</>;
}
