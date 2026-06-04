import { api } from "@/lib/api/api-client";
import {
  type CreateInvoiceRequest,
  createInvoiceRequestSchema,
  type Invoice,
  invoiceResponseSchema,
  type UpdateInvoiceRequest,
  updateInvoiceRequestSchema,
} from "@workspace/types";

export function createInvoice(data: CreateInvoiceRequest): Promise<Invoice> {
  return api
    .post("/invoices", createInvoiceRequestSchema.parse(data))
    .then((response) => invoiceResponseSchema.parse(response));
}

export function updateInvoice(
  id: string,
  data: UpdateInvoiceRequest,
): Promise<Invoice> {
  return api
    .patch(`/invoices/${id}`, updateInvoiceRequestSchema.parse(data))
    .then((response) => invoiceResponseSchema.parse(response));
}

export function printInvoice(id: string) {
  return api.get(`/invoices/${id}`);
}
