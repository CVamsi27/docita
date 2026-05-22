import { isOutstandingUnpaidSubscriptionPaymentStatus } from '@workspace/utils';

/** Matches subscription billing history / Pay now recovery semantics. */
export function clinicHasOutstandingPendingPayment(
  payments: ReadonlyArray<{ status: string }>,
): boolean {
  return payments.some((payment) =>
    isOutstandingUnpaidSubscriptionPaymentStatus(payment.status),
  );
}
