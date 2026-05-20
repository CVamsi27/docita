import { PaymentProvider } from '@/domains/payments/core/entities/payment-provider.enum';
import { detectPaymentProviderFromWebhookHeaders } from './payment-webhook-provider-detection.registry';

describe('detectPaymentProviderFromWebhookHeaders', () => {
  it('detects Razorpay from signature header', () => {
    expect(
      detectPaymentProviderFromWebhookHeaders({
        'x-razorpay-signature': 'sig',
      }),
    ).toBe(PaymentProvider.RAZORPAY);
  });

  it('detects Stripe from signature header', () => {
    expect(
      detectPaymentProviderFromWebhookHeaders({
        'stripe-signature': 'sig',
      }),
    ).toBe(PaymentProvider.STRIPE);
  });

  it('throws when no known provider header is present', () => {
    expect(() => detectPaymentProviderFromWebhookHeaders({})).toThrow(
      'Unable to detect payment provider from webhook headers',
    );
  });
});
