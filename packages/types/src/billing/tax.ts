import { z } from "zod";
import { stripHtmlTags } from "../api/sanitization";

export const DEFAULT_TAX_COUNTRY_CODE = "IN";
export const DEFAULT_TAX_CURRENCY = "INR";
export const DEFAULT_TAX_REGIME = "IN_GST" as const;

export function extractStateCodeFromGstin(
  gstin?: string | null,
): string | undefined {
  const stateCode = gstin?.slice(0, 2);
  return stateCode && /^\d{2}$/.test(stateCode) ? stateCode : undefined;
}

export const taxRegimeSchema = z.enum(["IN_GST", "VAT", "SALES_TAX", "NONE"]);
export type TaxRegime = z.infer<typeof taxRegimeSchema>;

export const taxInvoiceTypeSchema = z.enum([
  "TAX_INVOICE",
  "BILL_OF_SUPPLY",
  "RECEIPT",
  "LEGACY",
]);
export type TaxInvoiceType = z.infer<typeof taxInvoiceTypeSchema>;

/** Human-readable labels for {@link TaxInvoiceType} — never surface the raw enum in the UI. */
export const TAX_INVOICE_TYPE_LABELS: Record<TaxInvoiceType, string> = {
  TAX_INVOICE: "Tax Invoice",
  BILL_OF_SUPPLY: "Bill of Supply",
  RECEIPT: "Receipt",
  LEGACY: "Invoice",
};

/** Humanize a tax invoice type for display; falls back to "Invoice" for unknown values. */
export function formatTaxInvoiceType(type?: string | null): string {
  if (!type) return "Invoice";
  return TAX_INVOICE_TYPE_LABELS[type as TaxInvoiceType] ?? "Invoice";
}

export const taxTreatmentSchema = z.enum([
  "TAXABLE",
  "EXEMPT_HEALTHCARE",
  "EXEMPT",
  "ZERO_RATED",
  "NON_GST",
]);
export type TaxTreatment = z.infer<typeof taxTreatmentSchema>;

export const taxComponentTypeSchema = z.enum([
  "CGST",
  "SGST",
  "IGST",
  "CESS",
  "VAT",
  "SALES_TAX",
]);
export type TaxComponentType = z.infer<typeof taxComponentTypeSchema>;

export const placeOfSupplySchema = z.object({
  countryCode: z.string().length(2).default(DEFAULT_TAX_COUNTRY_CODE),
  stateCode: z.string().max(8).optional(),
  stateName: z.string().max(120).transform(stripHtmlTags).optional(),
});
export type PlaceOfSupply = z.infer<typeof placeOfSupplySchema>;

export const taxRegistrationSnapshotSchema = z.object({
  countryCode: z.string().length(2).default(DEFAULT_TAX_COUNTRY_CODE),
  regime: taxRegimeSchema.default(DEFAULT_TAX_REGIME),
  registrationId: z.string().max(32).transform(stripHtmlTags).optional(),
  registrationLabel: z.string().max(32).transform(stripHtmlTags).optional(),
  legalName: z.string().max(160).transform(stripHtmlTags).optional(),
  address: z.string().max(500).transform(stripHtmlTags).optional(),
  stateCode: z.string().max(8).transform(stripHtmlTags).optional(),
  stateName: z.string().max(120).transform(stripHtmlTags).optional(),
});
export type TaxRegistrationSnapshot = z.infer<
  typeof taxRegistrationSnapshotSchema
>;

export const taxComponentSchema = z.object({
  type: taxComponentTypeSchema,
  rate: z.number().min(0).max(100),
  taxableAmount: z.number().min(0),
  amount: z.number().min(0),
});
export type TaxComponent = z.infer<typeof taxComponentSchema>;

export const eInvoiceMetadataSchema = z.object({
  required: z.boolean().default(false),
  irn: z.string().max(128).transform(stripHtmlTags).optional(),
  qrCode: z.string().max(4096).transform(stripHtmlTags).optional(),
  acknowledgedAt: z.string().or(z.date()).optional(),
});
export type EInvoiceMetadata = z.infer<typeof eInvoiceMetadataSchema>;

export const invoiceTaxSummarySchema = z.object({
  countryCode: z.string().length(2).default(DEFAULT_TAX_COUNTRY_CODE),
  regime: taxRegimeSchema.default(DEFAULT_TAX_REGIME),
  currency: z.string().length(3).default(DEFAULT_TAX_CURRENCY),
  subtotal: z.number().min(0),
  discountTotal: z.number().min(0).default(0),
  taxableAmount: z.number().min(0).default(0),
  exemptAmount: z.number().min(0).default(0),
  taxTotal: z.number().min(0).default(0),
  grandTotal: z.number().min(0),
  components: z.array(taxComponentSchema).default([]),
  reverseCharge: z.boolean().default(false),
  placeOfSupply: placeOfSupplySchema.optional(),
  documentTitle: z.string().max(80).transform(stripHtmlTags).optional(),
  eInvoice: eInvoiceMetadataSchema.optional(),
});
export type InvoiceTaxSummary = z.infer<typeof invoiceTaxSummarySchema>;

export const taxSettingsSchema = z.object({
  countryCode: z.string().length(2).default(DEFAULT_TAX_COUNTRY_CODE),
  regime: taxRegimeSchema.default(DEFAULT_TAX_REGIME),
  registrationId: z.string().max(32).transform(stripHtmlTags).optional(),
  registrationLabel: z.string().max(32).transform(stripHtmlTags).optional(),
  legalName: z.string().max(160).transform(stripHtmlTags).optional(),
  stateCode: z.string().max(8).transform(stripHtmlTags).optional(),
  stateName: z.string().max(120).transform(stripHtmlTags).optional(),
  invoicePrefix: z.string().max(4).default("DC"),
});
export type TaxSettings = z.infer<typeof taxSettingsSchema>;
