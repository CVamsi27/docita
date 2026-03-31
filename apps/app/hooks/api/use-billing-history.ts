"use client";

import { useQuery } from "@tanstack/react-query";
import type { SubscriptionBillingPaymentHistoryItem } from "@workspace/types";
import { fetchJsonWithSession } from "@/lib/fetch-with-session";

export type BillingHistoryItem = SubscriptionBillingPaymentHistoryItem;

export function useBillingHistory(enabled = true) {
  return useQuery<BillingHistoryItem[]>({
    queryKey: ["billing-history"],
    queryFn: () =>
      fetchJsonWithSession<BillingHistoryItem[]>("/subscription/billing/payments"),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
