/**
 * Normalized subscription payment statuses for SaaS billing (Razorpay rows).
 * Keep in sync with billing-history UI helpers in the app.
 */
export function normalizeSubscriptionPaymentStatus(
  status: string | undefined | null,
): string {
  return (status ?? "").toLowerCase().trim();
}

export function isPaidSubscriptionPaymentStatus(status: string): boolean {
  return status === "paid" || status === "captured";
}

export function isTerminalClosedSubscriptionPaymentStatus(
  status: string,
): boolean {
  return status === "refunded" || status === "void" || status === "voided";
}

export function isFailedSubscriptionPaymentStatus(status: string): boolean {
  return status === "failed" || status === "declined";
}

/** Checkout started but not settled — must not count as paid. */
export function isPendingSubscriptionPaymentStatus(status: string): boolean {
  return (
    status === "pending" ||
    status === "processing" ||
    status === "created" ||
    status === "requires_action" ||
    status === "attempted" ||
    status === "due"
  );
}

/**
 * Outstanding subscription charge that still needs settlement (Pay now / retry).
 */
export function isOutstandingUnpaidSubscriptionPaymentStatus(
  status: string | undefined | null,
): boolean {
  const normalized = normalizeSubscriptionPaymentStatus(status);
  if (!normalized || normalized === "expired") {
    return false;
  }
  if (isPaidSubscriptionPaymentStatus(normalized)) {
    return false;
  }
  if (isTerminalClosedSubscriptionPaymentStatus(normalized)) {
    return false;
  }
  return (
    isPendingSubscriptionPaymentStatus(normalized) ||
    isFailedSubscriptionPaymentStatus(normalized)
  );
}
