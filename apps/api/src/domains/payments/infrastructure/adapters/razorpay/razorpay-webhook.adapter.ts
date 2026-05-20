import { Inject, Injectable, Logger } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { BaseRazorpayAdapter } from './razorpay.adapter';
import { RazorpayClientService } from './razorpay-client.service';
import { IWebhookHandler, WebhookEvent } from '@/domains/payments/core/ports';
import { PaymentProvider } from '@/domains/payments/core/entities/payment-provider.enum';

interface RazorpayWebhookPayload {
  event: string;
  payload?: Record<string, unknown>;
  [key: string]: unknown;
}

@Injectable()
export class RazorpayWebhookAdapter
  extends BaseRazorpayAdapter
  implements IWebhookHandler
{
  private readonly logger = new Logger(RazorpayWebhookAdapter.name);

  constructor(
    razorpayClient: RazorpayClientService,
    private configService: ConfigService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {
    super(razorpayClient);
  }

  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
    try {
      const webhookSecret = this.configService.get<string>(
        'RAZORPAY_WEBHOOK_SECRET',
      );
      if (!webhookSecret) {
        this.logger.warn('Razorpay webhook secret not configured');
        return false;
      }

      const payloadString =
        typeof payload === 'string' ? payload : payload.toString('utf8');

      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payloadString)
        .digest('hex');

      return this.timingSafeEqual(expectedSignature, signature);
    } catch (error) {
      this.logger.error('Failed to verify webhook signature', error);
      return false;
    }
  }

  parseWebhookEvent(payload: RazorpayWebhookPayload): WebhookEvent {
    return {
      id: crypto.randomUUID(),
      type: this.normalizeEventType(payload.event),
      provider: PaymentProvider.RAZORPAY,
      data: payload,
      timestamp: this.clock.now(),
    };
  }

  private normalizeEventType(razorpayEvent: string): string {
    const eventMap: Record<string, string> = {
      'subscription.activated': 'subscription.activated',
      'subscription.charged': 'subscription.renewed',
      'subscription.pending': 'subscription.pending',
      'subscription.halted': 'subscription.halted',
      'subscription.cancelled': 'subscription.cancelled',
      'payment.captured': 'payment.succeeded',
      'payment.failed': 'payment.failed',
      'payment_link.paid': 'payment_link.paid',
    };

    return eventMap[razorpayEvent] || razorpayEvent;
  }

  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }
}
