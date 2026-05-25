import { deskApi, type DeskRecordInvoiceSettlementVariables } from "@/features/desk/api/desk.api";
import { useAppMutation } from "@/lib/api/query-hooks";
import { queryKeys } from "@workspace/data-access";

export function useDeskRecordInvoiceSettlement() {
  return useAppMutation({
    mutationFn: ({ invoiceId, ...data }: DeskRecordInvoiceSettlementVariables) =>
      deskApi.recordInvoiceSettlement(invoiceId, data),
    invalidateKeys: [queryKeys.invoices.all()],
    successMessage: "Payment recorded",
  });
}
