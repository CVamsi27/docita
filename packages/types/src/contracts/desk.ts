import { z } from "zod";
import { markInvoicePaidRequestSchema } from "./billing";

/**
 * Body for recording an at-desk settlement against an invoice (patient pays
 * clinic — Flow B in docs/PAYMENT_FLOWS.md). Same shape as legacy mark-paid;
 * lives under the desk contract namespace, separate from platform Razorpay
 * checkout and subscription payment-link HTTP surfaces (Flow A).
 */
export const deskRecordInvoiceSettlementBodySchema =
  markInvoicePaidRequestSchema;

export type DeskRecordInvoiceSettlementBody = z.infer<
  typeof deskRecordInvoiceSettlementBodySchema
>;
