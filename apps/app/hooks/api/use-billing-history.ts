"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJsonWithSession } from "@/lib/fetch-with-session";

export interface BillingHistoryItem {
  id: string;
  amountCents: number;
  currency: string;
  status: string;
  createdAt: string;
  invoiceUrl?: string | null;
  description?: string;
}

export function useBillingHistory(enabled = true) {
  return useQuery<BillingHistoryItem[]>({
    queryKey: ["billing-history"],
    queryFn: () =>
      fetchJsonWithSession<BillingHistoryItem[]>("/subscription/billing/payments"),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
