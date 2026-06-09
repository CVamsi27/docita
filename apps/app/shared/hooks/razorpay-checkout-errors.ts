import { toast } from "sonner";

export const PAYMENT_CANCELED_TOAST_MESSAGE =
  "Payment was canceled. No charge was made." as const;

const PAYMENT_CANCELED_TOAST_DEDUPE_MS = 2_000;
let lastPaymentCanceledToastAt = 0;

/** Idempotent user feedback when Razorpay checkout is dismissed without payment. */
export function notifyPaymentCanceled(): void {
  const now = Date.now();
  if (now - lastPaymentCanceledToastAt < PAYMENT_CANCELED_TOAST_DEDUPE_MS) {
    return;
  }
  lastPaymentCanceledToastAt = now;
  toast.info(PAYMENT_CANCELED_TOAST_MESSAGE);
}

export interface RazorpayCheckoutError extends Error {
  paymentCanceled?: boolean;
}

export class PaymentCanceledError extends Error implements RazorpayCheckoutError {
  readonly paymentCanceled = true;

  constructor() {
    super(PAYMENT_CANCELED_TOAST_MESSAGE);
    this.name = "PaymentCanceledError";
  }
}

export class PaymentFailedError extends Error implements RazorpayCheckoutError {
  constructor() {
    super("We could not complete this payment. Please try again.");
    this.name = "PaymentFailedError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isPaymentCanceledError(
  error: unknown,
): error is RazorpayCheckoutError {
  if (error instanceof PaymentCanceledError) return true;

  return isRecord(error) && error.paymentCanceled === true;
}
