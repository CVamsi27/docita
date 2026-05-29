import { PaymentSessionStatus } from '@workspace/db';
import { isDocitaOnlinePaymentSession } from './docita-online-payment-session';

describe('isDocitaOnlinePaymentSession', () => {
  it('accepts active Razorpay sessions with a payment link', () => {
    expect(
      isDocitaOnlinePaymentSession({
        provider: 'razorpay',
        status: PaymentSessionStatus.CREATED,
        shortUrl: 'https://rzp.io/l/abc',
        paymentLink: null,
      }),
    ).toBe(true);
  });

  it('rejects cash sessions', () => {
    expect(
      isDocitaOnlinePaymentSession({
        provider: 'cash',
        status: PaymentSessionStatus.PENDING,
        shortUrl: null,
        paymentLink: null,
      }),
    ).toBe(false);
  });

  it('rejects Razorpay sessions without a link', () => {
    expect(
      isDocitaOnlinePaymentSession({
        provider: 'razorpay',
        status: PaymentSessionStatus.CREATED,
        shortUrl: null,
        paymentLink: null,
      }),
    ).toBe(false);
  });
});
