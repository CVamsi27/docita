export interface RazorpayCheckoutError extends Error {
  paymentCanceled?: boolean;
}

export class PaymentCanceledError extends Error implements RazorpayCheckoutError {
  readonly paymentCanceled = true;

  constructor() {
    super("Payment was canceled. No charge was made.");
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
  if (error instanceof PaymentCanceledError) {
    return true;
  }

  return isRecord(error) && error.paymentCanceled === true;
}
