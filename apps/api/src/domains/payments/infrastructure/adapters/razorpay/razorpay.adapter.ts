import { Injectable } from '@nestjs/common';
import Razorpay from 'razorpay';
import { Prisma } from '@workspace/db';
import { RazorpayClientService } from './razorpay-client.service';
import {
  IPaymentGateway,
  PaymentGatewayCapabilities,
} from '@/domains/payments/core/ports';
import { PaymentProvider } from '@/domains/payments/core/entities/payment-provider.enum';

@Injectable()
export abstract class BaseRazorpayAdapter implements IPaymentGateway {
  readonly provider = PaymentProvider.RAZORPAY;
  readonly capabilities: PaymentGatewayCapabilities = {
    supportsPaymentLinks: true,
    supportsSubscriptions: true,
    supportsRecurringPayments: true,
    supportsRefunds: true,
    supportsWebhooks: true,
    supportedCurrencies: ['INR', 'USD'],
    supportedPaymentMethods: [
      'CREDIT_CARD',
      'DEBIT_CARD',
      'UPI',
      'NET_BANKING',
      'WALLET',
    ],
  };

  constructor(protected razorpayClient: RazorpayClientService) {}

  async isAvailable(): Promise<boolean> {
    return this.razorpayClient.isAvailable();
  }

  protected getClient(): Razorpay {
    return this.razorpayClient.getClient();
  }

  protected toRecord(
    value: Prisma.JsonValue | Record<string, unknown>,
  ): Record<string, unknown> | null {
    if (!value || typeof value !== 'object') {
      return null;
    }
    if (Array.isArray(value)) {
      return null;
    }
    return Object.fromEntries(Object.entries(value));
  }

  protected getStringField(
    record: Record<string, unknown> | null,
    key: string,
  ): string | undefined {
    const value = record?.[key];
    return typeof value === 'string' ? value : undefined;
  }

  protected getNumberField(
    record: Record<string, unknown> | null,
    key: string,
  ): number | undefined {
    const value = record?.[key];
    return typeof value === 'number' ? value : undefined;
  }
}
