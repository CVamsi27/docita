import { isOutstandingUnpaidSubscriptionPaymentStatus } from '@workspace/utils';

/** Matches subscription billing history / Pay now recovery semantics. */
export function clinicHasOutstandingPendingPayment(
  payments: ReadonlyArray<{ status: string }> | null | undefined,
): boolean {
  if (!payments?.length) {
    return false;
  }
  return payments.some((payment) =>
    isOutstandingUnpaidSubscriptionPaymentStatus(payment.status),
  );
}
