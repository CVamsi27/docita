import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  SUBSCRIPTION_REPOSITORY_TOKEN,
  ISubscriptionRepository,
  CLINIC_OPERATIONS_TOKEN,
  IClinicOperations,
} from '@/domains/subscriptions/application/ports';
import { type RazorpayWebhookPayload } from '@workspace/types';
import { AdminAlertsService } from '@/shared/modules/messaging/admin-alerts/admin-alerts.service';
import { computeSubscriptionGraceDeadline } from '@/domains/subscriptions/core/constants/subscription-lockout.constants';
import { RazorpayWebhookEventHandler } from '@/domains/subscriptions/application/webhooks/razorpay/razorpay-webhook-event-handler.interface';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';

@Injectable()
export class SubscriptionPendingWebhookHandler implements RazorpayWebhookEventHandler {
  readonly event = 'subscription.pending';
  private readonly logger = new Logger(SubscriptionPendingWebhookHandler.name);

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
    const now = this.clock.now();
    const graceUntil = computeSubscriptionGraceDeadline(now);
    if (subscription) {
      try {
        subscription.enterPastDue(graceUntil, now);
        await this.subscriptionRepo.save(subscription);
      } catch (error) {
        // Domain save failed (e.g. optimistic concurrency, version
        // mismatch). Fall back to a raw status flip so the clinic still
        // gets the past-due signal — but log the original cause so
        // Sentry / log search can flag the underlying issue.
        this.logger.error(
          `Domain save for past-due transition failed for clinic ${clinicId}; falling back to markClinicPastDue`,
          error instanceof Error ? error.stack : String(error),
        );
        await this.subscriptionRepo.markClinicPastDue(clinicId, graceUntil);
      }

      await this.clinicOps.updateTierAndFeatures(
        clinicId,
        subscription.getPlan().value,
        'PAST_DUE',
        {},
      );

      await this.clinicOps.emitUpdate(clinicId, {
        clinicId,
        tier: subscription.getPlan().value,
        subscriptionStatus: 'PAST_DUE',
        subscriptionGraceUntil:
          subscription.getGraceUntil()?.toISOString() ??
          graceUntil.toISOString(),
      });
    }

    await this.adminAlerts.sendAdminAlert({
      alertKey: `subscription_pending:${clinicId}:${sub.id}`,
      severity: 'warn',
      subject: 'Subscription pending / past due',
      text:
        'A subscription entered pending status in Razorpay.\n' +
        `Clinic: ${clinicId}\n` +
        `RazorpaySubscriptionId: ${sub.id}`,
      dedupeWindowMs: 60 * 60 * 1000,
    });
  }
}
