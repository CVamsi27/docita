import { z } from "zod";
import { markInvoicePaidRequestSchema } from "./billing";

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
