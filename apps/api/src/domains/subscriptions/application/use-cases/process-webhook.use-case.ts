import {
  Injectable,
  Logger,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import {
  IPaymentGateway,
  PAYMENT_GATEWAY_TOKEN,
  SUBSCRIPTION_REPOSITORY_TOKEN,
  ISubscriptionRepository,
  CLINIC_OPERATIONS_TOKEN,
  IClinicOperations,
} from '@/domains/subscriptions/application/ports';
import { ActivateSubscriptionUseCase } from './activate-subscription.use-case';
import {
  type RazorpayWebhookPayload,
  SUBSCRIPTION_TRIAL_DAYS,
} from '@workspace/types';
import {
  ClinicTier,
  BillingCycle,
  SubscriptionStatusEnum,
  SubscriptionStatus,
} from '@/domains/subscriptions/core/value-objects';
import { Subscription } from '@/domains/subscriptions/core/entities/subscription.entity';
import { AdminAlertsService } from '@/shared/modules/messaging/admin-alerts/admin-alerts.service';
import { PrismaService } from '@/prisma/prisma.service';
import { computeSubscriptionGraceDeadline } from '@/domains/subscriptions/core/constants/subscription-lockout.constants';
import { SubscriptionPricingService } from '@/domains/subscriptions/core/services/subscription-pricing.service';

@Injectable()
export class ProcessWebhookUseCase {
  private readonly logger = new Logger(ProcessWebhookUseCase.name);

  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_TOKEN)
    private readonly subscriptionRepo: ISubscriptionRepository,
    @Inject(CLINIC_OPERATIONS_TOKEN)
    private readonly clinicOps: IClinicOperations,
    @Inject(PAYMENT_GATEWAY_TOKEN)
    private readonly paymentGateway: IPaymentGateway,
    private readonly activateSubscription: ActivateSubscriptionUseCase,
    private readonly adminAlerts: AdminAlertsService,
    private readonly prisma: PrismaService,
    private readonly subscriptionPricing: SubscriptionPricingService,
  ) {}
  private readNoteString(
    notes: Record<string, unknown> | undefined,
    key: string,
  ): string | undefined {
    const value = notes?.[key];
    return typeof value === 'string' ? value : undefined;
  }

  async execute(
    signature: string,
    rawBody: string,
    payload: RazorpayWebhookPayload,
  ): Promise<void> {
    if (!this.paymentGateway.verifyWebhookSignature(rawBody, signature)) {
      this.logger.warn('Invalid webhook signature');
      await this.adminAlerts.sendAdminAlert({
        alertKey: 'razorpay_webhook_signature_invalid',
        severity: 'warn',
        subject: 'Invalid Razorpay webhook signature',
        text:
          'Received a Razorpay webhook with an invalid signature.\n' +
          `Event: ${payload.event}\n` +
          'Action: Verify RAZORPAY_WEBHOOK_SECRET matches Razorpay dashboard configuration.',
        dedupeWindowMs: 30 * 60 * 1000,
      });
      throw new BadRequestException('Invalid signature');
    }

    this.logger.log(`Received webhook event: ${payload.event}`);

    switch (payload.event) {
      case 'subscription.activated':
        await this.handleSubscriptionActivated(payload);
        break;
      case 'subscription.charged':
        await this.handleSubscriptionCharged(payload);
        break;
      case 'subscription.pending':
        await this.handleSubscriptionPending(payload);
        break;
      case 'subscription.halted':
        await this.handleSubscriptionHalted(payload);
        break;
      case 'subscription.cancelled':
        await this.handleSubscriptionCancelled(payload);
        break;
      case 'payment.captured':
        await this.handlePaymentCaptured(payload);
        break;
      case 'payment.failed':
        await this.handlePaymentFailed(payload);
        break;
      default:
        this.logger.log(`Unhandled event type: ${payload.event}`);
    }
  }

  private async handleSubscriptionActivated(payload: RazorpayWebhookPayload) {
    const sub = payload.payload.subscription?.entity;
    if (!sub) return;

    const clinicId = sub.notes?.clinic_id;
    if (!clinicId) return;

    const tier = ClinicTier.fromString(
      this.readNoteString(sub.notes, 'tier') || 'ESSENTIAL',
    );
    const cycle = BillingCycle.fromString(
      this.readNoteString(sub.notes, 'cycle') || 'MONTHLY',
    );

    const periodStart = sub.current_start
      ? new Date(sub.current_start * 1000)
      : new Date();
    const periodEnd = sub.current_end
      ? new Date(sub.current_end * 1000)
      : new Date(Date.now() + SUBSCRIPTION_TRIAL_DAYS * 24 * 60 * 60 * 1000);

    let subscription = await this.subscriptionRepo.findByClinicId(clinicId);

    if (!subscription) {
      const listPricePaise = this.subscriptionPricing.getPricePaise(
        tier,
        cycle,
      );
      subscription = new Subscription({
        id: crypto.randomUUID(),
        clinicId,
        plan: tier,
        billingCycle: cycle,
        basePriceCents: listPricePaise,
        status: new SubscriptionStatus(SubscriptionStatusEnum.ACTIVE),
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        autoPayEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      });
    } else {
      subscription.activate();
      subscription.currentPeriodStart = periodStart;
      subscription.currentPeriodEnd = periodEnd;
    }

    subscription.razorpaySubscriptionId = sub.id;
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

  private async handleSubscriptionCharged(payload: RazorpayWebhookPayload) {
    const sub = payload.payload.subscription?.entity;
    const payment = payload.payload.payment?.entity;
    if (!sub || !payment) return;

    const clinicId = sub.notes?.clinic_id;
    if (!clinicId) return;

    const periodEnd = sub.current_end
      ? new Date(sub.current_end * 1000)
      : new Date(Date.now() + SUBSCRIPTION_TRIAL_DAYS * 24 * 60 * 60 * 1000);

    const subscription = await this.subscriptionRepo.findByClinicId(clinicId);
    if (subscription) {
      subscription.activate();
      subscription.currentPeriodEnd = periodEnd;
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

  private async handleSubscriptionPending(payload: RazorpayWebhookPayload) {
    const sub = payload.payload.subscription?.entity;
    if (!sub) return;

    const clinicId = sub.notes?.clinic_id;
    if (!clinicId) return;

    const subscription = await this.subscriptionRepo.findByClinicId(clinicId);
    const graceUntil = computeSubscriptionGraceDeadline();
    if (subscription) {
      try {
        subscription.enterPastDue(graceUntil);
        await this.subscriptionRepo.save(subscription);
      } catch {
        await this.prisma.subscription.updateMany({
          where: { clinicId },
          data: {
            status: 'PAST_DUE',
            graceUntil,
          },
        });
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

  private async handleSubscriptionHalted(payload: RazorpayWebhookPayload) {
    const sub = payload.payload.subscription?.entity;
    if (!sub) return;

    const clinicId = sub.notes?.clinic_id;
    if (!clinicId) return;

    const subscription = await this.subscriptionRepo.findByClinicId(clinicId);
    if (subscription) {
      subscription.enterGracePeriod(computeSubscriptionGraceDeadline());
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

  private async handleSubscriptionCancelled(payload: RazorpayWebhookPayload) {
    const sub = payload.payload.subscription?.entity;
    if (!sub) return;

    const clinicId = sub.notes?.clinic_id;
    if (!clinicId) return;

    const subscription = await this.subscriptionRepo.findByClinicId(clinicId);
    if (subscription) {
      subscription.cancel(false);
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

  private async handlePaymentCaptured(payload: RazorpayWebhookPayload) {
    const payment = payload.payload.payment?.entity;
    if (!payment) return;

    const clinicId = payment.notes?.clinic_id;
    if (!clinicId) return;

    const tier = payment.notes?.tier;
    const cycle = payment.notes?.cycle;

    if (tier && cycle && payment.order_id) {
      await this.activateSubscription.execute({
        clinicId,
        razorpayPaymentId: payment.id,
        razorpayOrderId: payment.order_id,
        razorpaySignature: '',
        tier: tier,
        cycle: cycle,
        skipPaymentVerification: true,
        verifiedAmountCents: payment.amount,
      });
    } else {
      await this.subscriptionRepo.updatePaymentStatus(
        payment.order_id!,
        'paid',
        { paymentId: payment.id },
      );
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

  private async handlePaymentFailed(payload: RazorpayWebhookPayload) {
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
