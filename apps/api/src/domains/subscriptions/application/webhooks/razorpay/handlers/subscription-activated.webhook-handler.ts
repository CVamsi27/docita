import { Inject, Injectable } from '@nestjs/common';
import {
  SUBSCRIPTION_REPOSITORY_TOKEN,
  ISubscriptionRepository,
  CLINIC_OPERATIONS_TOKEN,
  IClinicOperations,
} from '@/domains/subscriptions/application/ports';
import { type RazorpayWebhookPayload, SUBSCRIPTION_TRIAL_DAYS } from '@workspace/types';
import {
  ClinicTier,
  BillingCycle,
  SubscriptionStatusEnum,
} from '@/domains/subscriptions/core/value-objects';
import { Subscription } from '@/domains/subscriptions/core/entities/subscription.entity';
import { AdminAlertsService } from '@/shared/modules/messaging/admin-alerts/admin-alerts.service';
import { SubscriptionPricingService } from '@/domains/subscriptions/core/services/subscription-pricing.service';
import { RazorpayWebhookEventHandler } from '@/domains/subscriptions/application/webhooks/razorpay/razorpay-webhook-event-handler.interface';
import { readRazorpayNoteString } from '@/domains/subscriptions/application/webhooks/razorpay/razorpay-webhook.helpers';
import {
  CLOCK_PORT,
  type IClock,
} from '@/shared/common/ports/clock.port';

@Injectable()
export class SubscriptionActivatedWebhookHandler
  implements RazorpayWebhookEventHandler
{
  readonly event = 'subscription.activated';

  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_TOKEN)
    private readonly subscriptionRepo: ISubscriptionRepository,
    @Inject(CLINIC_OPERATIONS_TOKEN)
    private readonly clinicOps: IClinicOperations,
    private readonly adminAlerts: AdminAlertsService,
    private readonly subscriptionPricing: SubscriptionPricingService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async handle(payload: RazorpayWebhookPayload): Promise<void> {
    const sub = payload.payload.subscription?.entity;
    if (!sub) return;

    const clinicId = sub.notes?.clinic_id;
    if (!clinicId) return;

    const tier = ClinicTier.fromString(
      readRazorpayNoteString(sub.notes, 'tier') || 'ESSENTIAL',
    );
    const cycle = BillingCycle.fromString(
      readRazorpayNoteString(sub.notes, 'cycle') || 'MONTHLY',
    );

    const now = this.clock.now();
    const periodStart = sub.current_start
      ? new Date(sub.current_start * 1000)
      : now;
    const periodEnd = sub.current_end
      ? new Date(sub.current_end * 1000)
      : new Date(now.getTime() + SUBSCRIPTION_TRIAL_DAYS * 24 * 60 * 60 * 1000);

    let subscription = await this.subscriptionRepo.findByClinicId(clinicId);

    if (!subscription) {
      const listPricePaise = this.subscriptionPricing.getPricePaise(
        tier,
        cycle,
      );
      subscription = Subscription.createFromRazorpayActivation({
        id: crypto.randomUUID(),
        clinicId,
        plan: tier,
        billingCycle: cycle,
        basePriceCents: listPricePaise,
        periodStart,
        periodEnd,
        razorpaySubscriptionId: sub.id,
        now,
      });
    } else {
      subscription.applyRazorpayActivation(periodStart, periodEnd, sub.id, now);
    }

    await this.subscriptionRepo.save(subscription);

    await this.clinicOps.updateTierAndFeatures(
      clinicId,
      tier.value,
      SubscriptionStatusEnum.ACTIVE,
      {},
    );
    await this.clinicOps.emitUpdate(clinicId, {
      clinicId,
      tier: tier.value,
      subscriptionStatus: SubscriptionStatusEnum.ACTIVE,
      subscriptionGraceUntil: null,
    });

    await this.adminAlerts.sendAdminAlert({
      alertKey: `subscription_activated:${clinicId}`,
      severity: 'info',
      subject: 'Subscription activated',
      text:
        'A clinic subscription was activated via Razorpay.\n' +
        `Clinic: ${clinicId}\n` +
        `Tier: ${tier.value}\n` +
        `Cycle: ${cycle.value}\n` +
        `RazorpaySubscriptionId: ${sub.id}\n` +
        `PeriodEnd: ${periodEnd.toISOString()}`,
      dedupeWindowMs: 10 * 60 * 1000,
    });
  }
}
