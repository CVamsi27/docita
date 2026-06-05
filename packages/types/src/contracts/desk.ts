import { z } from "zod";
import { markInvoicePaidRequestSchema } from "./billing";
import { paginatedInvoiceListResponseSchema } from "../billing/invoices";
import { type InvoiceStatus } from "../shared/users";

export const DESK_COLLECTIBLE_INVOICE_STATUSES = [
  "PENDING",
  "PARTIALLY_PAID",
  "OVERDUE",
] as const satisfies readonly InvoiceStatus[];

export const deskCollectibleInvoiceStatusSchema = z.enum(
  DESK_COLLECTIBLE_INVOICE_STATUSES,
);

export type DeskCollectibleInvoiceStatus = z.infer<
  typeof deskCollectibleInvoiceStatusSchema
>;

export const listDeskOpenInvoicesQuerySchema = z.object({
  patientId: z.string().min(1),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const deskOpenInvoicesResponseSchema = paginatedInvoiceListResponseSchema;

export type ListDeskOpenInvoicesQuery = z.infer<
  typeof listDeskOpenInvoicesQuerySchema
>;

export type DeskOpenInvoicesResponse = z.infer<
  typeof deskOpenInvoicesResponseSchema
>;

/**
 * Body for recording an at-desk settlement against an invoice (patient pays
 * clinic — Flow B in docs/product/PAYMENT_FLOWS.md). Same shape as legacy mark-paid;
 * desk contract namespace, separate from optional clinic payment settings
 * (Flow A) and Docita SaaS subscription / platform payment surfaces.
 */
export const deskRecordInvoiceSettlementBodySchema =
  markInvoicePaidRequestSchema;

export type DeskRecordInvoiceSettlementBody = z.infer<
  typeof deskRecordInvoiceSettlementBodySchema
>;
