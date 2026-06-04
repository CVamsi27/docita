import { api } from "@/lib/api/api-client";
import {
  enqueuePdfJobResponseSchema,
  pdfJobStatusResponseSchema,
  type EnqueuePdfJobResponse,
  type PdfJobStatusResponse,
} from "@workspace/types";

export function enqueueInvoicePdf(
  id: string,
): Promise<EnqueuePdfJobResponse> {
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
