import { Inject, Injectable } from '@nestjs/common';
import {
  SUBSCRIPTION_REPOSITORY_TOKEN,
  ISubscriptionRepository,
} from '@/domains/subscriptions/application/ports';
import { ActivateSubscriptionUseCase } from '@/domains/subscriptions/application/use-cases/activate-subscription.use-case';
import { type RazorpayWebhookPayload } from '@workspace/types';
import { AdminAlertsService } from '@/shared/modules/messaging/admin-alerts/admin-alerts.service';
import { RazorpayWebhookEventHandler } from '@/domains/subscriptions/application/webhooks/razorpay/razorpay-webhook-event-handler.interface';

@Injectable()
export class PaymentCapturedWebhookHandler implements RazorpayWebhookEventHandler {
  readonly event = 'payment.captured';

  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_TOKEN)
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly activateSubscription: ActivateSubscriptionUseCase,
    private readonly adminAlerts: AdminAlertsService,
  ) {}

  async handle(payload: RazorpayWebhookPayload): Promise<void> {
    const payment = payload.payload.payment?.entity;
    if (!payment) return;

    const clinicId = payment.notes?.clinic_id;
    if (!clinicId) return;

    const tier = payment.notes?.tier;
    const cycle = payment.notes?.cycle;

    const orderId = payment.order_id;
    if (tier && cycle && orderId) {
      await this.activateSubscription.execute({
        clinicId,
        razorpayPaymentId: payment.id,
        razorpayOrderId: orderId,
        razorpaySignature: '',
        tier,
        cycle,
        skipPaymentVerification: true,
        verifiedAmountCents: payment.amount,
      });
    } else if (orderId) {
      await this.subscriptionRepo.updatePaymentStatus(orderId, 'paid', {
        paymentId: payment.id,
      });
    }

    await this.adminAlerts.sendAdminAlert({
      alertKey: `payment_captured:${clinicId}:${payment.order_id ?? payment.id}`,
      severity: 'info',
      subject: 'Payment captured',
      text:
        'A payment was captured in Razorpay.\n' +
        `Clinic: ${clinicId}\n` +
        `RazorpayPaymentId: ${payment.id}\n` +
        `RazorpayOrderId: ${payment.order_id ?? ''}\n` +
        `Amount: ${payment.amount} ${payment.currency}`,
      dedupeWindowMs: 10 * 60 * 1000,
    });
  }
}
