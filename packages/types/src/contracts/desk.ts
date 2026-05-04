import { z } from "zod";
import { markInvoicePaidRequestSchema } from "./billing";

/**
 * Body for recording an at-desk settlement against an invoice.
 * Same shape as legacy mark-paid; lives under the desk contract namespace
 * (separate from payment-link / subscription billing HTTP surfaces).
 */
export const deskRecordInvoiceSettlementBodySchema =
  markInvoicePaidRequestSchema;

export type DeskRecordInvoiceSettlementBody = z.infer<
  typeof deskRecordInvoiceSettlementBodySchema
>;
