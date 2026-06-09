import { Injectable, Optional } from '@nestjs/common';
import Razorpay from 'razorpay';
import { Prisma } from '@workspace/db';
import { RazorpayClientAdapter } from './razorpay-client.adapter';
import {
  IPaymentGateway,
  PaymentGatewayCapabilities,
} from '@/domains/payments/core/ports';
import { PaymentProvider } from '@/domains/payments/core/entities/payment-provider.enum';
import { CircuitBreakerRegistry } from '@/shared/common/utils/circuit-breaker.registry';

const RAZORPAY_REQUEST_TIMEOUT_MS = 5000;

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

  constructor(
    protected razorpayClient: RazorpayClientAdapter,
    @Optional()
    protected readonly circuitBreakerRegistry?: CircuitBreakerRegistry,
  ) {}

  async isAvailable(): Promise<boolean> {
    return this.razorpayClient.isAvailable();
  }

  protected getClient(): Razorpay {
    return this.razorpayClient.getClient();
  }

  protected async withRazorpayTimeout<T>(
    operation: () => Promise<T>,
  ): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(
          new Error(
            `Razorpay request timed out after ${RAZORPAY_REQUEST_TIMEOUT_MS}ms`,
          ),
        );
      }, RAZORPAY_REQUEST_TIMEOUT_MS);
    });

    const execute = async (): Promise<T> => {
      try {
        return await Promise.race([operation(), timeoutPromise]);
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    };

    const breaker = this.circuitBreakerRegistry?.get('razorpay-api');
    if (breaker) {
      return breaker.call(execute, async () => {
        throw new Error('Razorpay circuit breaker OPEN — request rejected');
      });
    }

    return execute();
  }

  protected toRecord(
    value: Prisma.JsonValue | Record<string, unknown>,
  ): Record<string, unknown> | null {
    if (!value || typeof value !== 'object') return null;
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
