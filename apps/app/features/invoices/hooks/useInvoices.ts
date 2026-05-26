"use client";

import { useQuery } from "@tanstack/react-query";
import { invoicesApi } from "@/features/invoices/api/invoices.api";
import { Feature, type ListInvoicesContractQuery } from "@workspace/types";
import { queryKeys } from "@workspace/data-access";
import { useTierFeatureEnabled } from "@/hooks/api/tier-feature-guards";
import { useAppMutation } from "@/lib/api/query-hooks";

/** Mirrors {@link useInvoices} in `@workspace/data-access` (API detail routes require invoicing). */
export function useInvoices(
  params?: Pick<ListInvoicesContractQuery, "patientId" | "status" | "limit">,
  options?: { enabled?: boolean },
) {
  const invoicingOk = useTierFeatureEnabled(Feature.INVOICING);
  return useQuery({
    queryKey: queryKeys.invoices.list(params),
    queryFn: () => invoicesApi.getAll(params),
    enabled: invoicingOk && (options?.enabled ?? true),
  });
}

export function useInvoice(id: string) {
  const invoicingOk = useTierFeatureEnabled(Feature.INVOICING);
  return useQuery({
    queryKey: queryKeys.invoices.detail(id),
    queryFn: () => invoicesApi.getById(id),
    enabled: invoicingOk && !!id,
  });
}

export function useCreateInvoice() {
  return useAppMutation({
    mutationFn: invoicesApi.create,
    invalidateKeys: [queryKeys.invoices.all()],
    successMessage: "Invoice created",
  });
}

