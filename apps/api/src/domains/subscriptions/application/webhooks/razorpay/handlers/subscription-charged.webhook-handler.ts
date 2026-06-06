import { Inject, Injectable } from '@nestjs/common';
import {
  SUBSCRIPTION_REPOSITORY_TOKEN,
  ISubscriptionRepository,
  CLINIC_OPERATIONS_TOKEN,
  IClinicOperations,
} from '@/domains/subscriptions/application/ports';
import {
  type RazorpayWebhookPayload,
  SUBSCRIPTION_TRIAL_DAYS,
} from '@workspace/types';
import { SubscriptionStatusEnum } from '@/domains/subscriptions/core/value-objects';
import { AdminAlertsService } from '@/shared/modules/messaging/admin-alerts/admin-alerts.service';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { BaseRazorpayWebhookHandler } from './base-razorpay-webhook-handler';

@Injectable()
export class SubscriptionChargedWebhookHandler extends BaseRazorpayWebhookHandler {
  readonly event = 'subscription.charged';

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
    const payment = payload.payload.payment?.entity;
    if (!sub || !payment) return;

    const clinicId = this.extractClinicId(payload);
    if (!clinicId) return;

    const now = this.clock.now();
    const periodEnd = sub.current_end
      ? new Date(sub.current_end * 1000)
      : new Date(now.getTime() + SUBSCRIPTION_TRIAL_DAYS * 24 * 60 * 60 * 1000);

    const subscription = await this.subscriptionRepo.findByClinicId(clinicId);
    if (subscription) {
      subscription.applyRazorpayRenewal(periodEnd, now);
      await this.subscriptionRepo.save(subscription);

      await this.clinicOps.updateTierAndFeatures(
        clinicId,
        subscription.getPlan().value,
        SubscriptionStatusEnum.ACTIVE,
        {},
      );

      await this.clinicOps.emitUpdate(clinicId, {
        clinicId,
        tier: subscription.getPlan().value,
        subscriptionStatus: SubscriptionStatusEnum.ACTIVE,
        subscriptionGraceUntil: null,
      });
    }

    await this.subscriptionRepo.savePayment({
      clinicId,
      amountCents: payment.amount,
      currency: payment.currency,
      status: 'paid',
      razorpayOrderId: payment.order_id || '',
      description: 'Subscription renewal',
    });

    await this.adminAlerts.sendAdminAlert({
      alertKey: `subscription_renewed:${clinicId}:${payment.order_id ?? 'unknown'}`,
      severity: 'info',
      subject: 'Subscription renewed (charged)',
      text:
        'A subscription charge was received from Razorpay.\n' +
        `Clinic: ${clinicId}\n` +
        `RazorpaySubscriptionId: ${sub.id}\n` +
        `RazorpayPaymentId: ${payment.id}\n` +
        `RazorpayOrderId: ${payment.order_id ?? ''}\n` +
        `Amount: ${payment.amount} ${payment.currency}\n` +
        `PeriodEnd: ${periodEnd.toISOString()}`,
      dedupeWindowMs: 10 * 60 * 1000,
    });
  }
}
