import { Inject, Injectable } from '@nestjs/common';
import {
  RAZORPAY_WEBHOOK_HANDLERS,
  RazorpayWebhookEventHandler,
} from '@/domains/subscriptions/application/webhooks/razorpay/razorpay-webhook-event-handler.interface';
import { SubscriptionActivatedWebhookHandler } from '@/domains/subscriptions/application/webhooks/razorpay/handlers/subscription-activated.webhook-handler';
import { SubscriptionChargedWebhookHandler } from '@/domains/subscriptions/application/webhooks/razorpay/handlers/subscription-charged.webhook-handler';
import { SubscriptionPendingWebhookHandler } from '@/domains/subscriptions/application/webhooks/razorpay/handlers/subscription-pending.webhook-handler';
import { SubscriptionHaltedWebhookHandler } from '@/domains/subscriptions/application/webhooks/razorpay/handlers/subscription-halted.webhook-handler';
import { SubscriptionCancelledWebhookHandler } from '@/domains/subscriptions/application/webhooks/razorpay/handlers/subscription-cancelled.webhook-handler';
import { PaymentCapturedWebhookHandler } from '@/domains/subscriptions/application/webhooks/razorpay/handlers/payment-captured.webhook-handler';
import { PaymentFailedWebhookHandler } from '@/domains/subscriptions/application/webhooks/razorpay/handlers/payment-failed.webhook-handler';

@Injectable()
export class RazorpayWebhookHandlerRegistry {
  private readonly handlersByEvent: Map<string, RazorpayWebhookEventHandler>;

  constructor(
    @Inject(RAZORPAY_WEBHOOK_HANDLERS)
    handlers: RazorpayWebhookEventHandler[],
  ) {
    this.handlersByEvent = new Map(
      handlers.map((handler) => [handler.event, handler]),
    );
  }

  getHandler(event: string): RazorpayWebhookEventHandler | undefined {
    return this.handlersByEvent.get(event);
  }
}

export const razorpayWebhookHandlerProviders = [
  SubscriptionActivatedWebhookHandler,
  SubscriptionChargedWebhookHandler,
  SubscriptionPendingWebhookHandler,
  SubscriptionHaltedWebhookHandler,
  SubscriptionCancelledWebhookHandler,
  PaymentCapturedWebhookHandler,
  PaymentFailedWebhookHandler,
  {
    provide: RAZORPAY_WEBHOOK_HANDLERS,
    useFactory: (
      activated: SubscriptionActivatedWebhookHandler,
      charged: SubscriptionChargedWebhookHandler,
      pending: SubscriptionPendingWebhookHandler,
      halted: SubscriptionHaltedWebhookHandler,
      cancelled: SubscriptionCancelledWebhookHandler,
      captured: PaymentCapturedWebhookHandler,
      failed: PaymentFailedWebhookHandler,
    ) =>
      [
        activated,
        charged,
        pending,
        halted,
        cancelled,
        captured,
        failed,
      ] satisfies RazorpayWebhookEventHandler[],
    inject: [
      SubscriptionActivatedWebhookHandler,
      SubscriptionChargedWebhookHandler,
      SubscriptionPendingWebhookHandler,
      SubscriptionHaltedWebhookHandler,
      SubscriptionCancelledWebhookHandler,
      PaymentCapturedWebhookHandler,
      PaymentFailedWebhookHandler,
    ],
  },
  RazorpayWebhookHandlerRegistry,
];
