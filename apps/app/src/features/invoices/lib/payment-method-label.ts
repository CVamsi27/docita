import { PaymentMethod } from "@workspace/types";
import { parseStringEnumMember } from "@workspace/utils";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";

/** Maps invoice `paymentMethod` (lowercase enum or legacy strings) to a short UI label. */
export function formatInvoicePaymentMethodLabel(
  raw: string | undefined | null,
  t: (key: string) => string,
): string | null {
  if (raw == null || raw === "") return null;
  const normalized = raw.trim().toLowerCase().replace(/-/g, "_");
  const method = parseStringEnumMember(
    Object.values(PaymentMethod),
    normalized,
  );
  switch (method) {
    case PaymentMethod.CASH:
      return t("paymentMethods.cash");
    case PaymentMethod.CARD:
      return t("paymentMethods.card");
    case PaymentMethod.UPI:
      return t("paymentMethods.upi");
    case PaymentMethod.ONLINE:
      return t("paymentMethods.online");
    case PaymentMethod.NET_BANKING:
      return t("paymentMethods.netBanking");
    case PaymentMethod.WALLET:
      return t("paymentMethods.wallet");
    default:
      return humanizeUiLabel(raw.replace(/_/g, " "));
  }
}

type InvoicePaymentSummaryFormatDate = (
  value: string | Date | null | undefined,
  pattern?: string,
  timezone?: string,
) => string;

/**
 * One scannable line for settled invoices, e.g. `Paid · 5 May 2026 · UPI`.
 * Returns null when there is no paid context to show.
 */
export function buildInvoicePaidSummaryLine(
  input: {
    status: string;
    paidAt?: string | Date | null;
    paymentMethod?: string | null;
    formatDate: InvoicePaymentSummaryFormatDate;
  },
  t: (key: string) => string,
): string | null {
  const st = input.status?.toUpperCase();
  if (st !== "PAID" && st !== "PARTIALLY_PAID") return null;
  const parts: string[] = [
    st === "PAID" ? t("paidSummary.paid") : t("paidSummary.partiallyPaid"),
  ];
  if (input.paidAt) {
    parts.push(input.formatDate(input.paidAt, "d MMM yyyy"));
  }
  const methodLabel = formatInvoicePaymentMethodLabel(input.paymentMethod, t);
  if (methodLabel) {
    parts.push(methodLabel);
  }
  return parts.join(" · ");
}
