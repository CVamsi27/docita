const INTERNAL_DESCRIPTION_PREFIX = /^\[INTERNAL:([A-Z0-9_]+)\]\s*/;

function humanizeInternalCategory(
  key: string,
  t: (key: string) => string,
): string {
  switch (key) {
    case "GUIDED_SETUP":
      return t("billingDisplay.internalCategories.guidedSetup");
    case "DATA_MIGRATION":
      return t("billingDisplay.internalCategories.dataMigration");
    case "CUSTOM_TRAINING":
      return t("billingDisplay.internalCategories.customTraining");
    case "INTEGRATION":
      return t("billingDisplay.internalCategories.integration");
    case "COMMERCIAL_DISCOUNT":
      return t("billingDisplay.internalCategories.commercialDiscount");
    case "OTHER":
      return t("billingDisplay.internalCategories.other");
    default:
      return key
        .toLowerCase()
        .split(/_+/g)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
  }
}

export function formatInvoiceDescriptionForDisplay(
  raw: string | null | undefined,
  t: (key: string) => string,
): { label: string; detail?: string } {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) {
    return { label: t("billingDisplay.subscriptionPayment") };
  }

  const match = INTERNAL_DESCRIPTION_PREFIX.exec(trimmed);
  if (!match) {
    return { label: trimmed };
  }

  const categoryKey = match[1] ?? "";
  const remainder = trimmed.slice(match[0].length).trim();
  return {
    label: humanizeInternalCategory(categoryKey, t),
    detail: remainder.length > 0 ? remainder : undefined,
  };
}

export function subscriptionGstNotice(t: (key: string) => string): string {
  return t("billingDisplay.gstInclusiveNotice");
}

export function subscriptionBillingCaption(t: (key: string) => string): string {
  return `${subscriptionGstNotice(t)} ${t("billingDisplay.tableCaption")}`;
}
