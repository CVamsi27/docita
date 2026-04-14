import { api } from "@/lib/api-client";
import {
  type CreateInvoiceRequest,
  createInvoiceRequestSchema,
  type Invoice,
  invoiceResponseSchema,
  type ListInvoicesContractQuery,
  listInvoicesQuerySchema,
  type MarkInvoicePaidRequest,
  markInvoicePaidRequestSchema,
  type UpdateInvoiceRequest,
  updateInvoiceRequestSchema,
  enqueuePdfJobResponseSchema,
  pdfJobStatusResponseSchema,
  type EnqueuePdfJobResponse,
  type PdfJobStatusResponse,
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
    const parsedParams = params
      ? listInvoicesQuerySchema.parse(params)
      : undefined;
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

    return api
      .get(`/invoices${query ? `?${query}` : ""}`)
      .then((response) => normalizeInvoices(invoicesListResponseSchema.parse(response)));
  },

  getById: (id: string) =>
    api.get(`/invoices/${id}`).then((response) => invoiceResponseSchema.parse(response)),

  create: (data: CreateInvoiceRequest) =>
    api.post("/invoices", createInvoiceRequestSchema.parse(data)).then((response) =>
      invoiceResponseSchema.parse(response),
    ),

  update: (id: string, data: UpdateInvoiceRequest) =>
    api.patch(`/invoices/${id}`, updateInvoiceRequestSchema.parse(data)).then((response) =>
      invoiceResponseSchema.parse(response),
    ),

  markPaid: (id: string, data?: MarkInvoicePaidRequest) =>
    api.post(
      `/payments/invoices/${id}/mark-paid`,
      markInvoicePaidRequestSchema.parse(data ?? {}),
    ),

  // There is no dedicated server "print" route; use the invoice view + window.print().
  // Keeping this for backward compatibility with old callers.
  print: (id: string) => api.get(`/invoices/${id}`),

  enqueuePdf: (id: string): Promise<EnqueuePdfJobResponse> =>
    api.get(`/invoices/${id}/pdf?async=true`).then((r) => enqueuePdfJobResponseSchema.parse(r)),

  getPdfStatus: (id: string, jobId: string): Promise<PdfJobStatusResponse> =>
    api.get(`/invoices/${id}/pdf/status?jobId=${jobId}`).then((r) =>
      pdfJobStatusResponseSchema.parse(r),
    ),
};
