import { api } from "@/lib/api/api-client";
import {
  deskOpenInvoicesResponseSchema,
  type DeskRecordInvoiceSettlementBody,
  deskRecordInvoiceSettlementBodySchema,
  type ListDeskOpenInvoicesQuery,
} from "@workspace/types";

export type DeskRecordInvoiceSettlementVariables = {
  invoiceId: string;
} & DeskRecordInvoiceSettlementBody;

export const deskApi = {
  getOpenInvoices: (params: ListDeskOpenInvoicesQuery) => {
    const query = new URLSearchParams({
      patientId: params.patientId,
    });
    if (params.limit) {
      query.set("limit", String(params.limit));
    }

    return api
      .get(`/desk/invoices?${query.toString()}`)
      .then((response) => deskOpenInvoicesResponseSchema.parse(response));
  },
  recordInvoiceSettlement: (
    invoiceId: string,
    data: DeskRecordInvoiceSettlementBody,
  ) =>
    api.post(
      `/desk/invoices/${invoiceId}/settlement`,
      deskRecordInvoiceSettlementBodySchema.parse(data),
    ),
};
