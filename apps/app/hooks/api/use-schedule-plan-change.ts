"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { TierName } from "@workspace/types";
import { fetchJsonWithSession } from "@/lib/fetch-with-session";

export interface SchedulePlanChangeInput {
  tier: TierName;
  billingCycle: "MONTHLY" | "YEARLY";
}

/**
 * Schedules a downgrade or cycle switch to apply at the current period end.
 * No payment is taken at scheduling time; the current tier remains active
 * until the scheduled date.
 */
export function useSchedulePlanChange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SchedulePlanChangeInput) =>
      fetchJsonWithSession<{
        scheduled: { tier: string; cycle: string; effectiveAt: string };
      }>("/subscription/billing/schedule-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["billing-status"] }),
        queryClient.invalidateQueries({ queryKey: ["clinic", "subscription"] }),
      ]);
    },
  });
}

/** Cancels a previously scheduled plan change. */
export function useCancelScheduledPlanChange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      fetchJsonWithSession<{ success: boolean }>(
        "/subscription/billing/schedule-change/cancel",
        { method: "POST" },
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["billing-status"] }),
        queryClient.invalidateQueries({ queryKey: ["clinic", "subscription"] }),
      ]);
    },
  });
}
