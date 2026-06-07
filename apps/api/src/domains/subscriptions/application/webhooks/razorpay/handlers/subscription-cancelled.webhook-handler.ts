// jscpd:ignore-start
import { Inject, Injectable } from '@nestjs/common';
import {
  SUBSCRIPTION_REPOSITORY_TOKEN,
  ISubscriptionRepository,
} from '@/domains/subscriptions/application/ports';
import { type RazorpayWebhookPayload } from '@workspace/types';
import { AdminAlertsService } from '@/shared/modules/messaging/admin-alerts/admin-alerts.service';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { BaseRazorpayWebhookHandler } from './base-razorpay-webhook-handler';

@Injectable()
export class SubscriptionCancelledWebhookHandler extends BaseRazorpayWebhookHandler {
  readonly event = 'subscription.cancelled';

  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_TOKEN)
    subscriptionRepo: ISubscriptionRepository,
    adminAlerts: AdminAlertsService,
    @Inject(CLOCK_PORT) clock: IClock,
  ) {
    super(subscriptionRepo, adminAlerts, clock);
  }

  async handle(payload: RazorpayWebhookPayload): Promise<void> {
    const sub = this.extractSubscriptionEntity(payload);
    if (!sub) return;

    const clinicId = this.extractClinicId(payload);
    if (!clinicId) return;

    const subscription = await this.subscriptionRepo.findByClinicId(clinicId);
    if (subscription) {
      subscription.cancel(false, this.clock.now());
// jscpd:ignore-end
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
