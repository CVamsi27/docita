"use client";

import { useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  queryKeys,
  useBillingHistory,
  useResumeSubscriptionPayment,
} from "@workspace/data-access";
import type { SubscriptionCurrentResponse, TierName } from "@workspace/types";
import {
  type CheckoutSuccessData,
  useSubscriptionCheckout,
} from "@/hooks/use-subscription-checkout";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { findRecoverableSubscriptionPayment } from "@/features/subscription/lib/recoverable-subscription-payment";

type UseResolveSubscriptionPaymentParams = {
  /** When false, skips billing-history fetch and resume/checkout wiring (parent owns recovery). */
  enabled?: boolean;
  subscription?: SubscriptionCurrentResponse | null;
  onCheckoutSuccess?: (data: CheckoutSuccessData) => void;
  /** When the parent already owns checkout (e.g. billing workspace), pass it to avoid a second Razorpay session. */
  checkoutTier?: (params: {
    tier: TierName;
    billingCycle: "MONTHLY" | "YEARLY";
  }) => Promise<void>;
  isCheckoutProcessing?: boolean;
};

export function useResolveSubscriptionPayment({
  enabled = true,
  subscription,
  onCheckoutSuccess,
  checkoutTier: checkoutTierOverride,
  isCheckoutProcessing: isCheckoutProcessingOverride,
}: UseResolveSubscriptionPaymentParams = {}) {
  const queryClient = useQueryClient();
  const { data: invoices, isLoading: isBillingHistoryLoading } =
    useBillingHistory(enabled);
  const resume = useResumeSubscriptionPayment();
  const internalCheckout = useSubscriptionCheckout(onCheckoutSuccess ?? (() => {}));
  const checkoutTier = checkoutTierOverride ?? internalCheckout.checkoutTier;
  const isCheckoutProcessing =
    isCheckoutProcessingOverride ?? internalCheckout.isProcessing;

  const recoverablePayment = useMemo(
    () => (enabled ? findRecoverableSubscriptionPayment(invoices) : null),
    [enabled, invoices],
  );

  const resolvePayment = useCallback(async () => {
    if (!enabled) {
      return;
    }
    const tier = subscription?.tier;
    const billingCycle = subscription?.billingCycle ?? "MONTHLY";
    const canOpenSubscriptionCheckout =
      tier &&
      tier !== "ENTERPRISE" &&
      (subscription?.basePriceCents ?? 0) > 0;

    if (recoverablePayment && canOpenSubscriptionCheckout) {
      try {
        await checkoutTier({
          tier: tier as TierName,
          billingCycle,
        });
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

    if (canOpenSubscriptionCheckout) {
      await checkoutTier({
        tier: tier as TierName,
        billingCycle,
      });
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
    subscription?.basePriceCents,
    subscription?.billingCycle,
    subscription?.tier,
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
