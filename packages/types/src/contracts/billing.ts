import { z } from "zod";
import { stripHtmlTags } from "../api/sanitization";
import { createInvoiceSchema, invoiceSchema } from "../billing/invoices";
import {
  createPaymentLinkSchema,
  paymentLinkResponseSchema,
  paymentSessionSchema,
} from "../billing/payments";
import { invoiceStatusSchema } from "../shared/users";

export const invoiceResponseSchema = invoiceSchema;

export const createInvoiceRequestSchema = createInvoiceSchema;

export const updateInvoiceRequestSchema = invoiceSchema.partial();

export const listInvoicesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  patientId: z.string().optional(),
  status: invoiceStatusSchema.optional(),
  date: z.string().optional(),
  search: z.string().optional(),
});

export const createPaymentLinkRequestSchema = createPaymentLinkSchema;
export const paymentLinkContractResponseSchema = paymentLinkResponseSchema;
export const paymentSessionContractResponseSchema = paymentSessionSchema;

/**
 * Desk / reception settlement channel. `OTHER` is legacy API input and is
 * normalized server-side to `OTHER_ONLINE` in audit metadata.
 */
export const markInvoicePaidPaymentMethodSchema = z.enum([
  "CASH",
  "CARD_POS",
  "UPI_QR",
  "PINELABS",
  "OTHER_TERMINAL",
  "OTHER_ONLINE",
  "OTHER",
]);

export const markInvoicePaidRequestSchema = z.object({
  paymentMethod: markInvoicePaidPaymentMethodSchema.default("CASH"),
  amount: z.number().positive().optional(),
  notes: z
    .string()
    .max(500)
    .optional()
    .transform((val) =>
      val === undefined || val === "" ? undefined : stripHtmlTags(val),
    ),
  reference: z
    .string()
    .max(120)
    .optional()
    .transform((val) =>
      val === undefined || val === "" ? undefined : stripHtmlTags(val),
    ),
});

export type MarkInvoicePaidPaymentMethod = z.infer<
  typeof markInvoicePaidPaymentMethodSchema
>;

/** Human-readable label for a desk/reception settlement channel ("paid by"). */
export const PAYMENT_CHANNEL_LABELS: Record<string, string> = {
  CASH: "Cash",
  CARD_POS: "Card (POS)",
  UPI_QR: "UPI / QR",
  PINELABS: "Pine Labs",
  OTHER_TERMINAL: "Card terminal",
  OTHER_ONLINE: "Online",
  OTHER: "Online",
};

/** Resolve a stored channel/method code to a display label, falling back to the raw code. */
export function formatPaymentChannelLabel(channel?: string | null): string {
  if (!channel) return "—";
  return PAYMENT_CHANNEL_LABELS[channel] ?? channel;
}

/** User-selectable desk/booking payment channels (excludes the legacy `OTHER` alias). */
export const PAYMENT_CHANNEL_OPTIONS: ReadonlyArray<{
  value: MarkInvoicePaidPaymentMethod;
  label: string;
}> = [
  { value: "CASH", label: "Cash" },
  { value: "CARD_POS", label: "Card (POS / swipe machine)" },
  { value: "UPI_QR", label: "UPI / QR (e.g. PhonePe)" },
  { value: "PINELABS", label: "Pine Labs terminal" },
  { value: "OTHER_TERMINAL", label: "Other card terminal" },
  { value: "OTHER_ONLINE", label: "Other online payment" },
];

export type InvoiceContractResponse = z.infer<typeof invoiceResponseSchema>;
export type CreateInvoiceRequest = z.infer<typeof createInvoiceRequestSchema>;
export type UpdateInvoiceRequest = z.infer<typeof updateInvoiceRequestSchema>;
export type ListInvoicesContractQuery = z.infer<typeof listInvoicesQuerySchema>;
export type CreatePaymentLinkRequest = z.infer<
  typeof createPaymentLinkRequestSchema
>;
export type PaymentLinkContractResponse = z.infer<
  typeof paymentLinkContractResponseSchema
>;
export type PaymentSessionContractResponse = z.infer<
  typeof paymentSessionContractResponseSchema
>;
export type MarkInvoicePaidRequest = z.infer<
  typeof markInvoicePaidRequestSchema
>;

/** One row of payment / settlement history for an invoice (links, desk capture, etc.). */
export const invoicePaymentActivityItemSchema = z.object({
  id: z.string(),
  provider: z.string(),
  status: z.string(),
  amountCents: z.number().int(),
  currency: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  shortUrl: z.string().nullable().optional(),
  paymentLink: z.string().nullable().optional(),
  channel: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export const invoicePaymentActivityResponseSchema = z.object({
  items: z.array(invoicePaymentActivityItemSchema),
});

export type InvoicePaymentActivityItem = z.infer<
  typeof invoicePaymentActivityItemSchema
>;
export type InvoicePaymentActivityResponse = z.infer<
  typeof invoicePaymentActivityResponseSchema
>;

/** Query for the collections-by-mode report. `from`/`to` are inclusive ISO dates (YYYY-MM-DD). */
export const collectionsByModeQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
});

export const collectionsByModeRowSchema = z.object({
  /** Stored channel code, e.g. CASH / CARD_POS / UPI_QR. */
  mode: z.string(),
  /** Human label for the channel. */
  label: z.string(),
  count: z.number().int().nonnegative(),
  amountCents: z.number().int().nonnegative(),
});

export const collectionsByModeResponseSchema = z.object({
  from: z.string(),
  to: z.string(),
  currency: z.string(),
  totalCents: z.number().int().nonnegative(),
  count: z.number().int().nonnegative(),
  byMode: z.array(collectionsByModeRowSchema),
});

export type CollectionsByModeQuery = z.infer<
  typeof collectionsByModeQuerySchema
>;
export type CollectionsByModeRow = z.infer<typeof collectionsByModeRowSchema>;
export type CollectionsByModeResponse = z.infer<
  typeof collectionsByModeResponseSchema
>;
