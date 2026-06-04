import { api } from "@/lib/api/api-client";
import {
  type Invoice,
  invoiceResponseSchema,
  type ListInvoicesContractQuery,
  listInvoicesQuerySchema,
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

export function getAllInvoices(
  params?: ListInvoicesContractQuery,
): Promise<Invoice[]> {
  const query = buildInvoiceSearchParams(params).toString();

  return api
    .get(`/invoices${query ? `?${query}` : ""}`)
    .then((response) =>
      normalizeInvoices(invoicesListResponseSchema.parse(response)),
    );
}

export function getInvoiceById(id: string): Promise<Invoice> {
  return api
    .get(`/invoices/${id}`)
    .then((response) => invoiceResponseSchema.parse(response));
}
