"use client";

import { useMutation } from "@tanstack/react-query";
import {
  type PlanMode,
  subscriptionBillingResumePaymentResponseSchema,
  type TierName,
} from "@workspace/types";
import { queryKeys } from "../lib/query-keys-clinician";
import { useAPIMutation } from "../core/use-api-mutation";
import { useDataAccessFetcher } from "../provider/hooks";

export interface SchedulePlanChangeInput {
  tier: TierName;
  billingCycle: "MONTHLY" | "YEARLY";
  /** Optional plan mode (Full / Front Desk / Core). Defaults to FULL. */
  planMode?: PlanMode;
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
      ),
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
