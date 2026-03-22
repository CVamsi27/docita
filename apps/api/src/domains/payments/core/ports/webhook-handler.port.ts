import { IPaymentGateway } from '@/domains/payments/core/ports/payment-gateway.port';
import { PaymentProvider } from '@/domains/payments/core/entities/payment-provider.enum';

export interface WebhookEvent {
  id: string;
  type: string;
  provider: PaymentProvider;
  data: unknown;
  timestamp: Date;
}

export interface IWebhookHandler extends IPaymentGateway {
  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean;
  parseWebhookEvent(payload: unknown): WebhookEvent;
  handleWebhookEvent?(event: WebhookEvent): Promise<void>;
}

export const WEBHOOK_HANDLER_TOKEN = Symbol('IWebhookHandler');
