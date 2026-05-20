import { Inject, Injectable } from '@nestjs/common';
import {
  SUBSCRIPTION_REPOSITORY_TOKEN,
  ISubscriptionRepository,
} from '@/domains/subscriptions/application/ports';
import { type RazorpayWebhookPayload } from '@workspace/types';
import { AdminAlertsService } from '@/shared/modules/messaging/admin-alerts/admin-alerts.service';
import {
  CLOCK_PORT,
  type IClock,
} from '@/shared/common/ports/clock.port';
import { RazorpayWebhookEventHandler } from '@/domains/subscriptions/application/webhooks/razorpay/razorpay-webhook-event-handler.interface';

@Injectable()
export class SubscriptionCancelledWebhookHandler
  implements RazorpayWebhookEventHandler
{
  readonly event = 'subscription.cancelled';

  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_TOKEN)
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly adminAlerts: AdminAlertsService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async handle(payload: RazorpayWebhookPayload): Promise<void> {
    const sub = payload.payload.subscription?.entity;
    if (!sub) return;

    const clinicId = sub.notes?.clinic_id;
    if (!clinicId) return;

    const subscription = await this.subscriptionRepo.findByClinicId(clinicId);
    if (subscription) {
      subscription.cancel(false, this.clock.now());
      await this.subscriptionRepo.save(subscription);
    }

    await this.adminAlerts.sendAdminAlert({
      alertKey: `subscription_cancelled:${clinicId}:${sub.id}`,
      severity: 'warn',
      subject: 'Subscription cancelled',
      text:
        'A subscription was cancelled in Razorpay.\n' +
        `Clinic: ${clinicId}\n` +
        `RazorpaySubscriptionId: ${sub.id}`,
      dedupeWindowMs: 60 * 60 * 1000,
    });
  }
}
