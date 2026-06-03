"use client";

import { useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  queryKeys,
  useBillingHistory,
  useResumeSubscriptionPayment,
} from "@workspace/data-access";
import {
  Tier,
  getTierName,
  tierSchema,
  type SubscriptionCurrentResponse,
  type TierName,
} from "@workspace/types";
import type { TierCheckoutParams } from "@/hooks/use-subscription-checkout";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { findRecoverableSubscriptionPayment } from "@/features/subscription/lib/recoverable-subscription-payment";

function parseCheckoutTierParams(
  subscription: SubscriptionCurrentResponse | null | undefined,
): { tier: TierName; billingCycle: "MONTHLY" | "YEARLY" } | null {
  const tier = subscription?.tier;
  if (
    !tier ||
    tier === getTierName(Tier.ENTERPRISE) ||
    (subscription?.basePriceCents ?? 0) <= 0
  ) {
    return null;
  }
  const parsed = tierSchema.safeParse(tier);
  if (!parsed.success) {
    return null;
  }
  const billingCycle = subscription?.billingCycle ?? "MONTHLY";
  if (billingCycle !== "MONTHLY" && billingCycle !== "YEARLY") {
    return null;
  }
  return { tier: parsed.data, billingCycle };
}

type UseResolveSubscriptionPaymentParams = {
  /** When false, skips billing-history fetch and recovery actions (caller owns the UI). */
  enabled?: boolean;
  subscription?: SubscriptionCurrentResponse | null;
  /** Shared with the billing workspace so only one Razorpay checkout hook runs in the tree. */
  checkoutTier: (params: TierCheckoutParams) => Promise<void>;
  isCheckoutProcessing: boolean;
};

export function useResolveSubscriptionPayment({
  enabled = true,
  subscription,
  checkoutTier,
  isCheckoutProcessing,
}: UseResolveSubscriptionPaymentParams) {
  const queryClient = useQueryClient();
  const { data: invoices, isLoading: isBillingHistoryLoading } =
    useBillingHistory(enabled);
  const resume = useResumeSubscriptionPayment();

  const recoverablePayment = useMemo(
    () => (enabled ? findRecoverableSubscriptionPayment(invoices) : null),
    [enabled, invoices],
  );

  const resolvePayment = useCallback(async () => {
    if (!enabled) {
      return;
    }
    const checkoutParams = parseCheckoutTierParams(subscription);

    if (recoverablePayment && checkoutParams) {
      try {
        await checkoutTier(checkoutParams);
        return;
      } catch (error) {
        showUserFacingErrorToast(
          error,
          "Could not open checkout for the pending payment. Please try again.",
          "payment",
        );
        return;
      }
    }

    if (recoverablePayment) {
      try {
        const result = await resume.mutateAsync(recoverablePayment.id);
        if (result.payUrl) {
          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: queryKeys.billingHistory.all(),
            }),
            queryClient.invalidateQueries({
              queryKey: queryKeys.clinic.subscriptionSettings(),
            }),
          ]);
          window.open(result.payUrl, "_blank", "noopener,noreferrer");
          return;
        }
        toast.success(
          "Payment link opened — complete payment in the new tab to restore access.",
        );
        return;
      } catch (error) {
        showUserFacingErrorToast(
          error,
          "Could not resume payment. Please try again or contact support.",
          "payment",
        );
        return;
      }
    }

    if (checkoutParams) {
      await checkoutTier(checkoutParams);
      return;
    }

    document.getElementById("billing-plans-section")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [
    enabled,
    recoverablePayment,
    resume,
    subscription,
    checkoutTier,
    queryClient,
  ]);

  return {
    resolvePayment,
    recoverablePayment,
    hasRecoverablePayment: recoverablePayment !== null,
    isResolving: resume.isPending || isCheckoutProcessing,
    isBillingHistoryLoading,
  };
}
