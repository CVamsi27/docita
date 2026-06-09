import { Inject } from '@nestjs/common';
import {
  SUBSCRIPTION_REPOSITORY_TOKEN,
  ISubscriptionRepository,
} from '@/domains/subscriptions/application/ports';
import { type RazorpayWebhookPayload } from '@workspace/types';
import { AdminAlertsService } from '@/shared/modules/messaging/admin-alerts/admin-alerts.service';
import { RazorpayWebhookEventHandler } from '@/domains/subscriptions/application/webhooks/razorpay/razorpay-webhook-event-handler.interface';
import { readRazorpayClinicId } from '@/domains/subscriptions/application/webhooks/razorpay/razorpay-webhook.helpers';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';

export abstract class BaseRazorpayWebhookHandler implements RazorpayWebhookEventHandler {
  abstract readonly event: string;

  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_TOKEN)
    protected readonly subscriptionRepo: ISubscriptionRepository,
    protected readonly adminAlerts: AdminAlertsService,
    @Inject(CLOCK_PORT) protected readonly clock: IClock,
  ) {}

  abstract handle(payload: RazorpayWebhookPayload): Promise<void>;

  protected extractClinicId(
    payload: RazorpayWebhookPayload,
  ): string | undefined {
    return readRazorpayClinicId(payload.payload.subscription?.entity?.notes);
  }

  protected extractSubscriptionEntity(payload: RazorpayWebhookPayload) {
    return payload.payload.subscription?.entity;
  }
}
