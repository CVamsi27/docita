import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@workspace/data-access";
import { deskApi, type DeskRecordInvoiceSettlementVariables } from "@/features/desk/api/desk.api";

export function useDeskRecordInvoiceSettlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, ...data }: DeskRecordInvoiceSettlementVariables) =>
      deskApi.recordInvoiceSettlement(invoiceId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.desk.all() });
      toast.success("Payment recorded");
    },
  });
}
