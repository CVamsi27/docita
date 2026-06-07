// jscpd:ignore-start
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
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { BaseRazorpayWebhookHandler } from './base-razorpay-webhook-handler';

@Injectable()
export class SubscriptionHaltedWebhookHandler extends BaseRazorpayWebhookHandler {
  readonly event = 'subscription.halted';

  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_TOKEN)
    subscriptionRepo: ISubscriptionRepository,
    adminAlerts: AdminAlertsService,
    @Inject(CLOCK_PORT) clock: IClock,
    @Inject(CLINIC_OPERATIONS_TOKEN)
    private readonly clinicOps: IClinicOperations,
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
      const now = this.clock.now();
// jscpd:ignore-end
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
