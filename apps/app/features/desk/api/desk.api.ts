import { api } from "@/lib/api/api-client";
import {
  type DeskRecordInvoiceSettlementBody,
  deskRecordInvoiceSettlementBodySchema,
} from "@workspace/types";

export type DeskRecordInvoiceSettlementVariables = {
  invoiceId: string;
} & DeskRecordInvoiceSettlementBody;

export const deskApi = {
  recordInvoiceSettlement: (
    invoiceId: string,
    data: DeskRecordInvoiceSettlementBody,
  ) =>
    api.post(
      `/desk/invoices/${invoiceId}/settlement`,
      deskRecordInvoiceSettlementBodySchema.parse(data),
    ),
};
