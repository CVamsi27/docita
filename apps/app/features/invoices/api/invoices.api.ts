import { api } from "@/lib/api-client";
import {
  createInvoiceRequestSchema,
  invoiceResponseSchema,
  listInvoicesQuerySchema,
  markInvoicePaidRequestSchema,
  updateInvoiceRequestSchema,
  type CreateInvoiceRequest,
  type Invoice,
  type ListInvoicesContractQuery,
  type MarkInvoicePaidRequest,
  type UpdateInvoiceRequest,
} from "@workspace/types";
import { z } from "zod";

const invoicesListResponseSchema = z.union([
  z.array(invoiceResponseSchema),
  z.object({
    items: z.array(invoiceResponseSchema),
    nextCursor: z.string().optional(),
    hasMore: z.boolean().optional(),
    count: z.number().optional(),
  }),
]);

const normalizeInvoices = (
  response: z.infer<typeof invoicesListResponseSchema>,
): Invoice[] => {
  return Array.isArray(response) ? response : response.items;
};

export const invoicesApi = {
  getAll: (params?: ListInvoicesContractQuery) => {
    const parsedParams = params ? listInvoicesQuerySchema.parse(params) : undefined;
    const searchParams = new URLSearchParams();
    if (parsedParams?.patientId)
      searchParams.set("patientId", parsedParams.patientId);
    if (parsedParams?.status) searchParams.set("status", parsedParams.status);
    if (parsedParams?.date) searchParams.set("date", parsedParams.date);
    if (parsedParams?.search) searchParams.set("search", parsedParams.search);
    if (parsedParams?.cursor) searchParams.set("cursor", parsedParams.cursor);
    if (parsedParams?.limit)
      searchParams.set("limit", String(parsedParams.limit));

    const query = searchParams.toString();

    return api.get<unknown>(`/invoices${query ? `?${query}` : ""}`).then((response) => {
      const parsed = invoicesListResponseSchema.parse(response);
      return normalizeInvoices(parsed);
    });
  },

  getById: (id: string) =>
    api.get<unknown>(`/invoices/${id}`).then((response) => {
      return invoiceResponseSchema.parse(response);
    }),

  create: (data: CreateInvoiceRequest) =>
    api
      .post<unknown>("/invoices", createInvoiceRequestSchema.parse(data))
      .then((response) => {
        return invoiceResponseSchema.parse(response);
      }),

  update: (id: string, data: UpdateInvoiceRequest) =>
    api
      .patch<unknown>(`/invoices/${id}`, updateInvoiceRequestSchema.parse(data))
      .then((response) => {
        return invoiceResponseSchema.parse(response);
      }),

  markPaid: (id: string, data?: MarkInvoicePaidRequest) =>
    api.post(
      `/invoices/${id}/pay`,
      markInvoicePaidRequestSchema.parse(data ?? {}),
    ),

  print: (id: string) => api.get(`/invoices/${id}/print`),
};
