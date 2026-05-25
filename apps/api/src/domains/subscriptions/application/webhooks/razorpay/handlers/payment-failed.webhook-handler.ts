import { Inject, Injectable } from '@nestjs/common';
import {
  SUBSCRIPTION_REPOSITORY_TOKEN,
  ISubscriptionRepository,
} from '@/domains/subscriptions/application/ports';
import { type RazorpayWebhookPayload } from '@workspace/types';
import { AdminAlertsService } from '@/shared/modules/messaging/admin-alerts/admin-alerts.service';
import { RazorpayWebhookEventHandler } from '@/domains/subscriptions/application/webhooks/razorpay/razorpay-webhook-event-handler.interface';

@Injectable()
export class PaymentFailedWebhookHandler implements RazorpayWebhookEventHandler {
  readonly event = 'payment.failed';

  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_TOKEN)
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly adminAlerts: AdminAlertsService,
  ) {}

  async handle(payload: RazorpayWebhookPayload): Promise<void> {
    const payment = payload.payload.payment?.entity;
    if (!payment) return;

    if (payment.order_id) {
      await this.subscriptionRepo.updatePaymentStatus(
        payment.order_id,
        'failed',
      );
    }

    await this.adminAlerts.sendAdminAlert({
      alertKey: `payment_failed:${payment.order_id ?? payment.id}`,
      severity: 'critical',
      subject: 'Payment failed',
      text:
        'A payment failed in Razorpay.\n' +
        `RazorpayPaymentId: ${payment.id}\n` +
        `RazorpayOrderId: ${payment.order_id ?? ''}\n` +
        `Amount: ${payment.amount} ${payment.currency}\n` +
        `Clinic: ${payment.notes?.clinic_id ?? 'unknown'}`,
      dedupeWindowMs: 30 * 60 * 1000,
    });
  }
}
