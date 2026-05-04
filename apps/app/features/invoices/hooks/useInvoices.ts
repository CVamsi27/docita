import { useQuery } from "@tanstack/react-query";
import { invoicesApi } from "@/features/invoices/api/invoices.api";
import type { ListInvoicesContractQuery } from "@workspace/types";
import { queryKeys } from "@workspace/data-access";
import { useAppMutation } from "@/lib/query-hooks";

export function useInvoices(
  params?: Pick<ListInvoicesContractQuery, "patientId" | "status" | "limit">,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.invoices.list(params),
    queryFn: () => invoicesApi.getAll(params),
    enabled: options?.enabled ?? true,
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: queryKeys.invoices.detail(id),
    queryFn: () => invoicesApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  return useAppMutation({
    mutationFn: invoicesApi.create,
    invalidateKeys: [queryKeys.invoices.all()],
    successMessage: "Invoice created",
  });
}

