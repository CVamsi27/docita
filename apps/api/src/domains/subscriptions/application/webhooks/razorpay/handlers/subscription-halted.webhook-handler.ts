import { Inject, Injectable } from '@nestjs/common';
import {
  SUBSCRIPTION_REPOSITORY_TOKEN,
  ISubscriptionRepository,
  CLINIC_OPERATIONS_TOKEN,
  IClinicOperations,
} from '@/domains/subscriptions/application/ports';
import { type RazorpayWebhookPayload } from '@workspace/types';
import { SubscriptionStatusEnum } from '@/domains/subscriptions/core/value-objects';
import { AdminAlertsService } from '@/shared/modules/messaging/admin-alerts/admin-alerts.service';
import { computeSubscriptionGraceDeadline } from '@/domains/subscriptions/core/constants/subscription-lockout.constants';
import { RazorpayWebhookEventHandler } from '@/domains/subscriptions/application/webhooks/razorpay/razorpay-webhook-event-handler.interface';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';

@Injectable()
export class SubscriptionHaltedWebhookHandler implements RazorpayWebhookEventHandler {
  readonly event = 'subscription.halted';

  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_TOKEN)
    private readonly subscriptionRepo: ISubscriptionRepository,
    @Inject(CLINIC_OPERATIONS_TOKEN)
    private readonly clinicOps: IClinicOperations,
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
      const now = this.clock.now();
      subscription.enterGracePeriod(computeSubscriptionGraceDeadline(now), now);
      await this.subscriptionRepo.save(subscription);
      await this.clinicOps.updateTierAndFeatures(
        clinicId,
        subscription.getPlan().value,
        SubscriptionStatusEnum.GRACE,
        {},
      );

      await this.clinicOps.emitUpdate(clinicId, {
        clinicId,
        tier: subscription.getPlan().value,
        subscriptionStatus: SubscriptionStatusEnum.GRACE,
        subscriptionGraceUntil:
          subscription.getGraceUntil()?.toISOString() ?? null,
      });
    }

    await this.adminAlerts.sendAdminAlert({
      alertKey: `subscription_halted:${clinicId}:${sub.id}`,
      severity: 'critical',
      subject: 'Subscription halted',
      text:
        'A subscription was halted in Razorpay (grace period entered).\n' +
        `Clinic: ${clinicId}\n` +
        `RazorpaySubscriptionId: ${sub.id}`,
      dedupeWindowMs: 60 * 60 * 1000,
    });
  }
}
