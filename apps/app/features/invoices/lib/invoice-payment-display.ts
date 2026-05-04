import { PaymentMethod } from "@workspace/types";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: "Cash",
  [PaymentMethod.CARD]: "Card",
  [PaymentMethod.UPI]: "UPI",
  [PaymentMethod.ONLINE]: "Online",
  [PaymentMethod.NET_BANKING]: "Net banking",
  [PaymentMethod.WALLET]: "Wallet",
};

/** Maps invoice `paymentMethod` (lowercase enum or legacy strings) to a short UI label. */
export function formatInvoicePaymentMethodLabel(
  raw: string | undefined | null,
): string | null {
  if (raw == null || raw === "") return null;
  const normalized = raw.trim().toLowerCase().replace(/-/g, "_");
  if ((Object.values(PaymentMethod) as string[]).includes(normalized)) {
    return PAYMENT_METHOD_LABELS[normalized as PaymentMethod];
  }
  return humanizeUiLabel(raw.replace(/_/g, " "));
}

export type InvoicePaymentSummaryFormatDate = (
  value: string | Date,
  locale: string,
  options: Intl.DateTimeFormatOptions,
) => string;

/**
 * One scannable line for settled invoices, e.g. `Paid · 5 May 2026 · UPI`.
 * Returns null when there is no paid context to show.
 */
export function buildInvoicePaidSummaryLine(input: {
  status: string;
  paidAt?: string | Date | null;
  paymentMethod?: string | null;
  formatDate: InvoicePaymentSummaryFormatDate;
}): string | null {
  const st = input.status?.toUpperCase();
  if (st !== "PAID" && st !== "PARTIALLY_PAID") {
    return null;
  }
  const parts: string[] = [];
  parts.push(st === "PAID" ? "Paid" : "Partially paid");
  if (input.paidAt) {
    parts.push(
      input.formatDate(input.paidAt, "en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    );
  }
  const methodLabel = formatInvoicePaymentMethodLabel(input.paymentMethod);
  if (methodLabel) {
    parts.push(methodLabel);
  }
  return parts.join(" · ");
}
