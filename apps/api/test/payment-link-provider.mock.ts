import { randomUUID } from 'crypto';
import type { IPaymentLinkProvider } from '@/domains/payments/core/ports/payment-link-provider.port';
import { PaymentProvider } from '@/domains/payments/core/entities/payment-provider.enum';
import { PaymentLinkStatus } from '@/domains/payments/core/entities/payment-link-status.enum';

interface MockPaymentLinkProviderOptions {
  idFactory?: () => string;
}

export function createMockPaymentLinkProvider(
  options: MockPaymentLinkProviderOptions = {},
): jest.Mocked<IPaymentLinkProvider> {
  const nextId =
    options.idFactory ?? (() => `plink_${randomUUID().replaceAll('-', '')}`);
  const isAvailable: jest.MockedFunction<IPaymentLinkProvider['isAvailable']> =
    jest.fn(async () => true);
  const createPaymentLink: jest.MockedFunction<
    IPaymentLinkProvider['createPaymentLink']
  > = jest.fn(async (linkRequest) => {
    const id = nextId();
    const shortUrl = `https://pay.test.docita.local/${id}`;
    return {
      id,
      url: shortUrl,
      shortUrl,
      status: PaymentLinkStatus.CREATED,
      expiresAt: linkRequest.expiresAt,
    };
  });
  const getPaymentLink: jest.MockedFunction<
    IPaymentLinkProvider['getPaymentLink']
  > = jest.fn(async (_linkId) => null);
  const cancelPaymentLink: jest.MockedFunction<
    IPaymentLinkProvider['cancelPaymentLink']
  > = jest.fn(async (_linkId) => undefined);

  return {
    provider: PaymentProvider.RAZORPAY,
    capabilities: {
      supportsPaymentLinks: true,
      supportsSubscriptions: false,
      supportsRecurringPayments: false,
      supportsRefunds: false,
      supportsWebhooks: false,
      supportedCurrencies: ['INR'],
      supportedPaymentMethods: ['upi', 'card', 'netbanking'],
    },
    isAvailable,
    createPaymentLink,
    getPaymentLink,
    cancelPaymentLink,
  };
}

export function clearMockPaymentLinkProvider(
  provider: jest.Mocked<IPaymentLinkProvider>,
): void {
  provider.createPaymentLink.mockClear();
  provider.getPaymentLink.mockClear();
  provider.cancelPaymentLink.mockClear();
}
