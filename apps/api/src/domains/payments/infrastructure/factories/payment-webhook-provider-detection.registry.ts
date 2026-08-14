import { PaymentProvider } from '@/domains/payments/core/entities/payment-provider.enum';

type WebhookProviderDetector = {
  readonly headerKey: string;
  readonly provider: PaymentProvider;
};

const WEBHOOK_PROVIDER_DETECTORS: readonly WebhookProviderDetector[] = [
  { headerKey: 'x-razorpay-signature', provider: PaymentProvider.RAZORPAY },
  { headerKey: 'stripe-signature', provider: PaymentProvider.STRIPE },
] as const;

export function detectPaymentProviderFromWebhookHeaders(
  headers: Record<string, string>,
): PaymentProvider {
  for (const { headerKey, provider } of WEBHOOK_PROVIDER_DETECTORS) {
    if (headers[headerKey]) return provider;
  }

  throw new Error('Unable to detect payment provider from webhook headers');
}
