"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { SubscriptionCurrentResponse } from "@workspace/types";
import type { Clinic } from "@/lib/contexts/clinic-context";
import { getTrialState } from "@/lib/subscription/subscription-trial-state";

type UseAutoResolveSubscriptionPaymentParams = {
  enabled: boolean;
  subscription?: SubscriptionCurrentResponse | null;
  isLoading?: boolean;
  isBillingHistoryLoading?: boolean;
  resolvePayment: () => Promise<void>;
  clinic?: Pick<Clinic, "subscriptionStatus" | "trialEndsAt"> | null;
};

export function useAutoResolveSubscriptionPayment({
  enabled,
  subscription,
  isLoading = false,
  isBillingHistoryLoading = false,
  resolvePayment,
  clinic,
}: UseAutoResolveSubscriptionPaymentParams) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const attemptedRef = useRef(false);

  const subscriptionStatus = subscription?.subscriptionStatus;
  const hasOutstandingPendingPayment =
    subscription?.hasOutstandingPendingPayment === true;
  const renewalPeriodLapsed =
    subscription?.currentPeriodEnd != null
      ? new Date(subscription.currentPeriodEnd).getTime() <= Date.now()
      : false;
  const isPaymentDue =
    subscriptionStatus === "PAYMENT_DUE" || subscriptionStatus === "PAST_DUE";
  const isExpired = subscriptionStatus === "EXPIRED";
  const isInGracePeriod = subscriptionStatus === "GRACE";
  const trialState = getTrialState(clinic ?? null);
  const showRecoveryCard =
    isPaymentDue ||
    isInGracePeriod ||
    trialState === "GRACE" ||
    (hasOutstandingPendingPayment && renewalPeriodLapsed);

  const shouldAutoResolve = useMemo(
    () =>
      enabled &&
      searchParams.get("resolvePayment") === "1" &&
      (showRecoveryCard ||
        hasOutstandingPendingPayment ||
        isPaymentDue ||
        isInGracePeriod ||
        isExpired),
    [
      enabled,
      searchParams,
      showRecoveryCard,
      hasOutstandingPendingPayment,
      isPaymentDue,
      isInGracePeriod,
      isExpired,
    ],
  );

  useEffect(() => {
    if (
      attemptedRef.current ||
      isLoading ||
      isBillingHistoryLoading ||
      !shouldAutoResolve
    ) {
      return;
    }

    attemptedRef.current = true;
    void resolvePayment();

    const params = new URLSearchParams(searchParams.toString());
    params.delete("resolvePayment");
    router.replace(`/settings?${params.toString()}`, { scroll: false });
  }, [
    isLoading,
    isBillingHistoryLoading,
    resolvePayment,
    router,
    searchParams,
    shouldAutoResolve,
  ]);
}
