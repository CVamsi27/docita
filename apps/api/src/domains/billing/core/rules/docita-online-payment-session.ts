import { PaymentSessionStatus } from '@workspace/db';

/**
 * Docita only sends patient pay CTAs for Razorpay sessions created in billing
 * (`docita.work/pay/{sessionId}`). Cash and external hospital payment URLs are out of scope.
 */
export function isDocitaOnlinePaymentSession(session: {
  provider: string;
  status: string;
  shortUrl?: string | null;
  paymentLink?: string | null;
}): boolean {
  if (session.provider !== 'razorpay') return false;

  if (
    session.status !== PaymentSessionStatus.CREATED &&
    session.status !== PaymentSessionStatus.PENDING
  )
    return false;

  return Boolean(session.shortUrl?.trim() || session.paymentLink?.trim());
}
