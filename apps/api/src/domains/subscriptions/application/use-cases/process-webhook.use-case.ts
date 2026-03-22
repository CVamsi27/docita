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
import type { RazorpayWebhookPayload } from '@workspace/types';
import {
  ClinicTier,
  BillingCycle,
  SubscriptionStatusEnum,
  SubscriptionStatus,
} from '@/domains/subscriptions/core/value-objects';
import { Subscription } from '@/domains/subscriptions/core/entities/subscription.entity';

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
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    let subscription = await this.subscriptionRepo.findByClinicId(clinicId);

    if (!subscription) {
      subscription = new Subscription({
        id: crypto.randomUUID(),
        clinicId,
        plan: tier,
        billingCycle: cycle,
        basePriceCents: 0,
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
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const subscription = await this.subscriptionRepo.findByClinicId(clinicId);
    if (subscription) {
      subscription.activate();
      subscription.currentPeriodEnd = periodEnd;
      await this.subscriptionRepo.save(subscription);
    }

    await this.subscriptionRepo.savePayment({
      clinicId,
      amountCents: payment.amount,
      currency: payment.currency,
      status: 'paid',
      razorpayOrderId: payment.order_id || '',
      description: 'Subscription renewal',
    });
  }

  private async handleSubscriptionPending(payload: RazorpayWebhookPayload) {
    const sub = payload.payload.subscription?.entity;
    if (!sub) return;

    const clinicId = sub.notes?.clinic_id;
    if (!clinicId) return;

    const subscription = await this.subscriptionRepo.findByClinicId(clinicId);
    if (subscription) {
      await this.clinicOps.updateTierAndFeatures(
        clinicId,
        subscription.getPlan().value,
        'PAST_DUE',
        {},
      );
    }
  }

  private async handleSubscriptionHalted(payload: RazorpayWebhookPayload) {
    const sub = payload.payload.subscription?.entity;
    if (!sub) return;

    const clinicId = sub.notes?.clinic_id;
    if (!clinicId) return;

    const subscription = await this.subscriptionRepo.findByClinicId(clinicId);
    if (subscription) {
      subscription.enterGracePeriod();
      await this.subscriptionRepo.save(subscription);
      await this.clinicOps.updateTierAndFeatures(
        clinicId,
        subscription.getPlan().value,
        SubscriptionStatusEnum.GRACE,
        {},
      );
    }
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
      });
    } else {
      await this.subscriptionRepo.updatePaymentStatus(
        payment.order_id!,
        'paid',
        { paymentId: payment.id },
      );
    }
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
  }
}
