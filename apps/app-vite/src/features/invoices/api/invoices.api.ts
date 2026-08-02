import { api } from "@/lib/api/api-client";
import {
  type Invoice,
  invoiceResponseSchema,
  type ListInvoicesContractQuery,
  listInvoicesQuerySchema,
} from "@workspace/types";
import {
  type CreateInvoiceRequest,
  createInvoiceRequestSchema,
  type UpdateInvoiceRequest,
  updateInvoiceRequestSchema,
} from "@workspace/types";
import {
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

function normalizeInvoices(
  response: z.infer<typeof invoicesListResponseSchema>,
): Invoice[] {
  return Array.isArray(response) ? response : response.items;
}

function buildInvoiceSearchParams(
  params?: ListInvoicesContractQuery,
): URLSearchParams {
  const parsedParams = params ? listInvoicesQuerySchema.parse(params) : undefined;
  const searchParams = new URLSearchParams();
  if (parsedParams?.patientId) searchParams.set("patientId", parsedParams.patientId);
  if (parsedParams?.status) searchParams.set("status", parsedParams.status);
  if (parsedParams?.date) searchParams.set("date", parsedParams.date);
  if (parsedParams?.search) searchParams.set("search", parsedParams.search);
  if (parsedParams?.cursor) searchParams.set("cursor", parsedParams.cursor);
  if (parsedParams?.limit) searchParams.set("limit", String(parsedParams.limit));
  return searchParams;
}

export async function getAllInvoices(
  params?: ListInvoicesContractQuery,
): Promise<Invoice[]> {
  const searchParams = buildInvoiceSearchParams(params);
  const query = searchParams.toString();
  const response = await api.get<unknown>(
    `/invoices${query ? `?${query}` : ""}`,
  );
  return normalizeInvoices(invoicesListResponseSchema.parse(response));
}

export async function getInvoiceById(id: string): Promise<Invoice> {
  const response = await api.get<unknown>(`/invoices/${id}`);
  return invoiceResponseSchema.parse(response);
}

export async function createInvoice(
  data: CreateInvoiceRequest,
): Promise<Invoice> {
  const response = await api.post<unknown>(
    "/invoices",
    createInvoiceRequestSchema.parse(data),
  );
  return invoiceResponseSchema.parse(response);
}

export async function updateInvoice(
  id: string,
  data: UpdateInvoiceRequest,
): Promise<Invoice> {
  const response = await api.patch<unknown>(
    `/invoices/${id}`,
    updateInvoiceRequestSchema.parse(data),
  );
  return invoiceResponseSchema.parse(response);
}

export function enqueueInvoicePdf(id: string): Promise<EnqueuePdfJobResponse> {
  return api
    .get(`/invoices/${id}/pdf?async=true`)
    .then((response) => enqueuePdfJobResponseSchema.parse(response));
}

export function getInvoicePdfStatus(
  id: string,
  jobId: string,
): Promise<PdfJobStatusResponse> {
  return api
    .get(`/invoices/${id}/pdf/status?jobId=${jobId}`)
    .then((response) => pdfJobStatusResponseSchema.parse(response));
}

export const invoicesApi = {
  getAll: getAllInvoices,
  getById: getInvoiceById,
  create: createInvoice,
  update: updateInvoice,
  enqueuePdf: enqueueInvoicePdf,
  getPdfStatus: getInvoicePdfStatus,
};
