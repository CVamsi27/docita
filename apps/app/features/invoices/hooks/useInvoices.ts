import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoicesApi } from "@/features/invoices/api/invoices.api";
import { toast } from "sonner";
import type { ListInvoicesContractQuery } from "@workspace/types";

export function useInvoices(
  params?: Pick<ListInvoicesContractQuery, "patientId" | "status">,
) {
  return useQuery({
    queryKey: ["invoices", params],
    queryFn: () => invoicesApi.getAll(params),
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: ["invoices", id],
    queryFn: () => invoicesApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: invoicesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice created");
    },
  });
}

export function useMarkInvoicePaid(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => invoicesApi.markPaid(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Payment recorded");
    },
  });
}
