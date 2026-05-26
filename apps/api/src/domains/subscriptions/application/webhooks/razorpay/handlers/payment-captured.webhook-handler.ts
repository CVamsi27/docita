import { Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@workspace/db';
import {
  SUBSCRIPTION_REPOSITORY_TOKEN,
  ISubscriptionRepository,
} from '@/domains/subscriptions/application/ports';
import { ActivateSubscriptionUseCase } from '@/domains/subscriptions/application/use-cases/activate-subscription.use-case';
import { type RazorpayWebhookPayload } from '@workspace/types';
import { AdminAlertsService } from '@/shared/modules/messaging/admin-alerts/admin-alerts.service';
import { RazorpayWebhookEventHandler } from '@/domains/subscriptions/application/webhooks/razorpay/razorpay-webhook-event-handler.interface';
import {
  readRazorpayClinicId,
  readRazorpayNoteString,
} from '@/domains/subscriptions/application/webhooks/razorpay/razorpay-webhook.helpers';

@Injectable()
export class PaymentCapturedWebhookHandler implements RazorpayWebhookEventHandler {
  readonly event = 'payment.captured';
  private readonly logger = new Logger(PaymentCapturedWebhookHandler.name);

  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_TOKEN)
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly activateSubscription: ActivateSubscriptionUseCase,
    private readonly adminAlerts: AdminAlertsService,
  ) {}

  async handle(payload: RazorpayWebhookPayload): Promise<void> {
    const payment = payload.payload.payment?.entity;
    if (!payment) return;

    const clinicId = readRazorpayClinicId(payment.notes);
    if (!clinicId) return;

    // Audit FL11 (2026-05-23): application-layer idempotency check.
    // A unique index on SubscriptionPayment.razorpayPaymentId enforces the
    // invariant at the database level; this short-circuit avoids running
    // the full activation path on retried webhooks (Razorpay retries up to
    // 24h) and keeps log/audit noise low. Lookup goes through the repository
    // port to keep the application layer free of direct PrismaService usage
    // (check:prisma-boundary).
    const existing = await this.subscriptionRepo.findPaymentByRazorpayPaymentId(
      payment.id,
    );
    if (existing) {
      this.logger.log({
        event: 'razorpay_webhook_duplicate',
        kind: 'payment.captured',
        razorpayPaymentId: payment.id,
        clinicId,
      });
      return;
    }

    const tier = payment.notes?.tier;
    const cycle = payment.notes?.cycle;

    const orderId = payment.order_id;
    const subscriptionPaymentId = readRazorpayNoteString(
      payment.notes,
      'subscriptionPaymentId',
    );
    const activateCaptured = async (params: {
      tier: string;
      cycle: string;
      razorpayOrderId: string;
      subscriptionPaymentId?: string;
    }) => {
      try {
        await this.activateSubscription.execute({
          clinicId,
          razorpayPaymentId: payment.id,
          razorpayOrderId: params.razorpayOrderId,
          razorpaySignature: '',
          tier: params.tier,
          cycle: params.cycle,
          subscriptionPaymentId: params.subscriptionPaymentId,
          skipPaymentVerification: true,
          verifiedAmountCents: payment.amount,
        });
      } catch (err) {
        // Idempotency net: a concurrent retry that slipped past the
        // findPaymentByRazorpayPaymentId pre-check will trip the unique
        // index on SubscriptionPayment.razorpayPaymentId. Treat as
        // already-processed so Razorpay stops retrying.
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          this.logger.log({
            event: 'razorpay_webhook_duplicate_p2002',
            kind: 'payment.captured',
            razorpayPaymentId: payment.id,
            clinicId,
          });
          return;
        }
        throw err;
      }
    };

    if (orderId && tier && cycle) {
      await activateCaptured({
        tier,
        cycle,
        razorpayOrderId: orderId,
      });
    } else if (orderId) {
      const subscription = await this.subscriptionRepo.findByClinicId(clinicId);
      if (subscription) {
        await activateCaptured({
          tier: subscription.getPlan().value,
          cycle: subscription.getBillingCycle().value,
          razorpayOrderId: orderId,
        });
      } else {
        await this.subscriptionRepo.updatePaymentStatus(orderId, 'paid', {
          paymentId: payment.id,
        });
      }
    } else if (subscriptionPaymentId) {
      const subscription = await this.subscriptionRepo.findByClinicId(clinicId);
      if (subscription) {
        await activateCaptured({
          tier: subscription.getPlan().value,
          cycle: subscription.getBillingCycle().value,
          razorpayOrderId: '',
          subscriptionPaymentId,
        });
      }
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
