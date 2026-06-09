export function normalizeSubscriptionPaymentStatus(
  status: string | undefined | null,
): string {
  return (status ?? "").toLowerCase().trim();
}

export function isPaidSubscriptionPaymentStatus(status: string): boolean {
  return PAID_SUBSCRIPTION_PAYMENT_STATUSES.has(status);
}

export function isSubscriptionBillingRowPaid(
  status: string | undefined | null,
  paidAt?: string | Date | null,
): boolean {
  if (paidAt) return true;
  return isPaidSubscriptionPaymentStatus(
    normalizeSubscriptionPaymentStatus(status),
  );
}

export function resolveSubscriptionBillingAmountCents(row: {
  amountCents?: number | null;
  grandTotalCents?: number | null;
  amount?: number | null;
}): number {
  return (
    [
      row.grandTotalCents,
      row.amountCents,
      convertLegacyAmountToCents(row.amount),
    ].find(isPositiveAmountCents) ?? 0
  );
}

export function isTerminalClosedSubscriptionPaymentStatus(
  status: string,
): boolean {
  return TERMINAL_CLOSED_SUBSCRIPTION_PAYMENT_STATUSES.has(status);
}

export function isFailedSubscriptionPaymentStatus(status: string): boolean {
  return FAILED_SUBSCRIPTION_PAYMENT_STATUSES.has(status);
}

export function isPendingSubscriptionPaymentStatus(status: string): boolean {
  return PENDING_SUBSCRIPTION_PAYMENT_STATUSES.has(status);
}

export function isOutstandingUnpaidSubscriptionPaymentStatus(
  status: string | undefined | null,
): boolean {
  const normalized = normalizeSubscriptionPaymentStatus(status);
  return OUTSTANDING_UNPAID_SUBSCRIPTION_PAYMENT_STATUSES.has(normalized);
}

function convertLegacyAmountToCents(amount: number | null | undefined): number {
  return typeof amount === "number" ? Math.round(amount * 100) : 0;
}

function isPositiveAmountCents(amount: number | null | undefined): boolean {
  return typeof amount === "number" && amount > 0;
}

const PAID_SUBSCRIPTION_PAYMENT_STATUSES = new Set([
  "paid",
  "captured",
  "succeeded",
]);

const TERMINAL_CLOSED_SUBSCRIPTION_PAYMENT_STATUSES = new Set([
  "refunded",
  "void",
  "voided",
]);

const FAILED_SUBSCRIPTION_PAYMENT_STATUSES = new Set(["failed", "declined"]);

const PENDING_SUBSCRIPTION_PAYMENT_STATUSES = new Set([
  "pending",
  "processing",
  "created",
  "requires_action",
  "attempted",
  "due",
]);

const OUTSTANDING_UNPAID_SUBSCRIPTION_PAYMENT_STATUSES = new Set([
  ...PENDING_SUBSCRIPTION_PAYMENT_STATUSES,
  ...FAILED_SUBSCRIPTION_PAYMENT_STATUSES,
]);
