/**
 * Shared clinic-facing billing copy (GST framing, invoice labels).
 * List prices in plan pickers match this wording per UI standard.
 */
export const SUBSCRIPTION_GST_INCLUSIVE_NOTICE =
  "Prices and invoice totals are inclusive of GST where applicable.";

/** Table caption: GST line plus where PDF receipts appear. */
export const BILLING_HISTORY_TABLE_CAPTION = `${SUBSCRIPTION_GST_INCLUSIVE_NOTICE} After payment, use Receipt to download the PDF invoice. Pending rows stay unpaid until checkout completes.`;

/** Shown under usage meters on Settings / Billing to explain limits and overage. */
export const BILLING_USAGE_AND_OVERAGE_EXPLAINER =
  "Each billing cycle includes set amounts for consultations and team seats. Starter does not include patient WhatsApp messaging; Essential and higher plans do, with per-plan included message counts. In-app alerts (and email at 80%) appear as you approach limits. Use counts toward included amounts first; anything above is charged as overage at the rates shown on your plan card.";

const INTERNAL_DESCRIPTION_PREFIX = /^\[INTERNAL:([A-Z0-9_]+)\]\s*/;

const INTERNAL_CATEGORY_LABELS: Record<string, string> = {
  GUIDED_SETUP: "Guided setup",
  DATA_MIGRATION: "Data migration",
  CUSTOM_TRAINING: "Custom training",
  INTEGRATION: "Integration",
  COMMERCIAL_DISCOUNT: "Commercial discount",
  OTHER: "Other service",
};

function humanizeInternalCategory(key: string): string {
  const mapped = INTERNAL_CATEGORY_LABELS[key];
  if (mapped) return mapped;
  return key
    .toLowerCase()
    .split(/_+/g)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function formatInvoiceDescriptionForDisplay(
  raw: string | null | undefined,
): { label: string; detail?: string } {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) {
    return { label: "Subscription payment" };
  }

  const match = INTERNAL_DESCRIPTION_PREFIX.exec(trimmed);
  if (!match) {
    return { label: trimmed };
  }

  const categoryKey = match[1] ?? "";
  const remainder = trimmed.slice(match[0].length).trim();
  return {
    label: humanizeInternalCategory(categoryKey),
    detail: remainder.length > 0 ? remainder : undefined,
  };
}
