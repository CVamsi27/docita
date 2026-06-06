import type { BillingHistoryItem } from "@workspace/data-access";

const RECOVERABLE_STATUSES = new Set([
  "failed",
  "declined",
  "pending",
  "processing",
  "created",
  "requires_action",
  "attempted",
  "due",
]);

export function findRecoverableSubscriptionPayment(
  invoices: BillingHistoryItem[] | undefined,
): BillingHistoryItem | null {
  if (!invoices?.length) return null;

  return (
    invoices.find((payment) => {
      const status = (payment.status ?? "").toLowerCase().trim();
      return RECOVERABLE_STATUSES.has(status);
    }) ?? null
  );
}
