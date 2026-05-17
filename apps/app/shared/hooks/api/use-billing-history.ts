"use client";

import { useQuery } from "@tanstack/react-query";
import {
  type SubscriptionBillingPaymentHistoryItem,
  subscriptionBillingPaymentHistoryResponseSchema,
} from "@workspace/types";
import { fetchJsonWithSession } from "@/lib/auth/fetch-with-session";

export type BillingHistoryItem = SubscriptionBillingPaymentHistoryItem;

export function useBillingHistory(enabled = true) {
  return useQuery<BillingHistoryItem[]>({
    queryKey: ["billing-history"],
    queryFn: async () => {
      const parsed = subscriptionBillingPaymentHistoryResponseSchema.parse(
        await fetchJsonWithSession<unknown>("/subscription/billing/payments"),
      );
      return [...parsed];
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
