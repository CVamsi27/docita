import { PaymentProvider } from '@/domains/payments/core/entities/payment-provider.enum';

export interface PaymentGatewayCapabilities {
  supportsPaymentLinks: boolean;
  supportsSubscriptions: boolean;
  supportsRecurringPayments: boolean;
  supportsRefunds: boolean;
  supportsWebhooks: boolean;
  supportedCurrencies: string[];
  supportedPaymentMethods: string[];
}

export interface IPaymentGateway {
  readonly provider: PaymentProvider;
  readonly capabilities: PaymentGatewayCapabilities;
  isAvailable(): Promise<boolean>;
}

export const PAYMENT_GATEWAY_TOKEN = Symbol('IPaymentGateway');
