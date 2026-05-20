"use client";

import { useMutation } from "@tanstack/react-query";
import {
  subscriptionBillingResumePaymentResponseSchema,
  type SubscriptionBillingResumePaymentResponse,
  type TierName,
} from "@workspace/types";
import { queryKeys } from "../lib/query-keys";
import { useAPIMutation } from "../core/use-api-mutation";
import { useDataAccessFetcher } from "../provider/hooks";

export interface SchedulePlanChangeInput {
  tier: TierName;
  billingCycle: "MONTHLY" | "YEARLY";
}

export type SchedulePlanChangeResponse = {
  scheduled: { tier: string; cycle: string; effectiveAt: string };
};

export function useResumeSubscriptionPayment() {
  const fetcher = useDataAccessFetcher();
  return useMutation({
    mutationFn: async (paymentId: string) =>
      subscriptionBillingResumePaymentResponseSchema.parse(
        await fetcher<unknown>(
          `/subscription/billing/payments/${paymentId}/resume`,
          { method: "POST", retries: 0 },
        ),
      ) as SubscriptionBillingResumePaymentResponse,
  });
}

export function useSchedulePlanChange() {
  return useAPIMutation<SchedulePlanChangeResponse, SchedulePlanChangeInput>(
    "/subscription/billing/schedule-change",
    "POST",
    {
      invalidateKeys: [
        queryKeys.billing.status(),
        queryKeys.clinic.subscriptionSettings(),
      ],
    },
  );
}

export function useCancelScheduledPlanChange() {
  return useAPIMutation<{ success: boolean }, void>(
    "/subscription/billing/schedule-change/cancel",
    "POST",
    {
      invalidateKeys: [
        queryKeys.billing.status(),
        queryKeys.clinic.subscriptionSettings(),
      ],
    },
  );
}
