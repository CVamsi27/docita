import { Injectable, Logger } from '@nestjs/common';
import Razorpay from 'razorpay';
import { Prisma } from '@workspace/db';
import { RazorpayClientService } from './razorpay-client.service';
import {
  IPaymentGateway,
  PaymentGatewayCapabilities,
} from '@/domains/payments/core/ports';
import { PaymentProvider } from '@/domains/payments/core/entities/payment-provider.enum';
import { getCorrelationId } from '@/shared/common/context/request-context.store';

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

  constructor(protected razorpayClient: RazorpayClientService) {}

  async isAvailable(): Promise<boolean> {
    return this.razorpayClient.isAvailable();
  }

  protected getClient(): Razorpay {
    return this.razorpayClient.getClient();
  }

  private readonly timeoutLogger = new Logger('RazorpayTimeout');

  /**
   * Audit FL10 (2026-05-23): the Razorpay Node SDK (v2.9.x) exposes no
   * `AbortSignal` / `AbortController` hook on its operations, so when the
   * timeoutPromise wins the `Promise.race` the underlying SDK request is
   * still in flight and will resolve into the void. The leak is bounded
   * by node's GC once the SDK call eventually completes; the operational
   * harm is the held HTTP socket until that happens.
   *
   * Two things we *can* do without forking the SDK:
   *   1. Emit a structured log on every timeout so observability can
   *      alert when timeouts spike (the canary for upstream degradation).
   *   2. Keep the timeout tight (5s) so the leak window is short.
   *
   * Replacing the SDK with raw `fetch` + AbortController would close the
   * leak fully but is a separate piece of work — tracked in the audit doc.
   */
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

    try {
      return await Promise.race([operation(), timeoutPromise]);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith('Razorpay request timed out')
      ) {
        this.timeoutLogger.error({
          event: 'razorpay_request_timeout',
          timeoutMs: RAZORPAY_REQUEST_TIMEOUT_MS,
          correlationId: getCorrelationId(),
        });
      }
      throw error;
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    }
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
