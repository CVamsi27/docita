import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoicesApi } from "../api/invoices.api";
import { toast } from "sonner";

export function useInvoices(params?: { patientId?: string; status?: string }) {
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
