/**
 * Subscription Webhooks Controller
 * Handles Razorpay webhooks for subscription events
 */

import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  Logger,
  BadRequestException,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionBillingService } from './subscription-billing.service';
import { PaymentGatewayFactory } from '../../gateways/payment-gateway.factory';
import { PaymentGateway } from '../../gateways/payment.gateway';
import { ClinicTier, BillingCycle } from '@workspace/db';

interface RazorpaySubscriptionEntity {
  id: string;
  plan_id: string;
  customer_id: string;
  status: string;
  current_start?: number;
  current_end?: number;
  notes?: Record<string, string>;
}

interface RazorpayPaymentEntity {
  id: string;
  amount: number;
  currency: string;
  status: string;
  order_id?: string;
  notes?: Record<string, string>;
}

interface RazorpayWebhookPayload {
  event: string;
  payload: {
    subscription?: {
      entity: RazorpaySubscriptionEntity;
    };
    payment?: {
      entity: RazorpayPaymentEntity;
    };
  };
}

@Controller('webhooks/subscriptions')
export class SubscriptionWebhooksController {
  private readonly logger = new Logger(SubscriptionWebhooksController.name);

  constructor(
    private prisma: PrismaService,
    private billingService: SubscriptionBillingService,
    private gatewayFactory: PaymentGatewayFactory,
    private paymentGateway: PaymentGateway,
  ) {}

  @Post('razorpay')
  @HttpCode(200)
  async handleRazorpayWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Req() request: RawBodyRequest<Request>,
    @Body() payload: RazorpayWebhookPayload,
  ) {
    // Verify webhook signature
    const gateway = this.gatewayFactory.getSubscriptionGateway();
    const rawBody = request.rawBody?.toString() || JSON.stringify(payload);

    if (!gateway.verifyWebhookSignature(rawBody, signature)) {
      this.logger.warn('Invalid webhook signature');
      throw new BadRequestException('Invalid signature');
    }

    this.logger.log(`Received webhook event: ${payload.event}`);

    try {
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

        case 'subscription.completed':
          this.handleSubscriptionCompleted(payload);
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
    } catch (error) {
      this.logger.error(`Error processing webhook: ${payload.event}`, error);
      // Still return 200 to prevent Razorpay retries for processing errors
    }

    return { status: 'ok' };
  }

  // =========================================================================
  // Subscription Events
  // =========================================================================

  private async handleSubscriptionActivated(payload: RazorpayWebhookPayload) {
    const subscription = payload.payload.subscription?.entity;
    if (!subscription) return;

    const clinicId = subscription.notes?.clinic_id;
    if (!clinicId) {
      this.logger.warn(
        'Subscription activated without clinic_id in notes',
        subscription.id,
      );
      return;
    }

    const tier = (subscription.notes?.tier as ClinicTier) || 'CORE';
    const cycle = (subscription.notes?.cycle as BillingCycle) || 'MONTHLY';

    const periodStart = subscription.current_start
      ? new Date(subscription.current_start * 1000)
      : new Date();
    const periodEnd = subscription.current_end
      ? new Date(subscription.current_end * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Update or create subscription in database
    await this.prisma.subscription.upsert({
      where: { clinicId },
      create: {
        clinicId,
        plan: tier,
        billingCycle: cycle,
        priceCents: 0, // Will be updated from payment
        status: 'ACTIVE',
        razorpaySubscriptionId: subscription.id,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
      update: {
        status: 'ACTIVE',
        razorpaySubscriptionId: subscription.id,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
    });

    // Update clinic tier
    await this.prisma.clinic.update({
      where: { id: clinicId },
      data: {
        tier,
        subscriptionStatus: 'active',
      },
    });

    // Emit real-time update
    this.paymentGateway.emitClinicUpdate(clinicId, {
      clinicId,
      tier,
      subscriptionStatus: 'active',
    });

    this.logger.log(
      `Subscription activated for clinic ${clinicId}: ${subscription.id}`,
    );
  }

  private async handleSubscriptionCharged(payload: RazorpayWebhookPayload) {
    const subscription = payload.payload.subscription?.entity;
    const payment = payload.payload.payment?.entity;
    if (!subscription || !payment) return;

    const clinicId = subscription.notes?.clinic_id;
    if (!clinicId) return;

    // Update subscription period
    const periodEnd = subscription.current_end
      ? new Date(subscription.current_end * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await this.prisma.subscription.update({
      where: { clinicId },
      data: {
        status: 'ACTIVE',
        currentPeriodEnd: periodEnd,
      },
    });

    // Create payment record
    await this.prisma.subscriptionPayment.create({
      data: {
        clinicId,
        amountCents: payment.amount,
        currency: payment.currency,
        status: 'paid',
        razorpayPaymentId: payment.id,
        paidAt: new Date(),
        description: 'Subscription renewal',
      },
    });

    this.logger.log(`Subscription charged for clinic ${clinicId}`);
  }

  private async handleSubscriptionPending(payload: RazorpayWebhookPayload) {
    const subscription = payload.payload.subscription?.entity;
    if (!subscription) return;

    const clinicId = subscription.notes?.clinic_id;
    if (!clinicId) return;

    // Mark as past due - payment retry pending
    await this.prisma.subscription.update({
      where: { clinicId },
      data: { status: 'PAST_DUE' },
    });

    await this.prisma.clinic.update({
      where: { id: clinicId },
      data: { subscriptionStatus: 'past_due' },
    });

    this.logger.log(`Subscription pending for clinic ${clinicId}`);
  }

  private async handleSubscriptionHalted(payload: RazorpayWebhookPayload) {
    const subscription = payload.payload.subscription?.entity;
    if (!subscription) return;

    const clinicId = subscription.notes?.clinic_id;
    if (!clinicId) return;

    // Enter grace period
    await this.billingService.enterGracePeriod(clinicId);

    this.logger.log(
      `Subscription halted (grace period) for clinic ${clinicId}`,
    );
  }

  private async handleSubscriptionCancelled(payload: RazorpayWebhookPayload) {
    const subscription = payload.payload.subscription?.entity;
    if (!subscription) return;

    const clinicId = subscription.notes?.clinic_id;
    if (!clinicId) return;

    await this.prisma.subscription.update({
      where: { clinicId },
      data: { status: 'CANCELLED' },
    });

    this.logger.log(`Subscription cancelled for clinic ${clinicId}`);
  }

  private handleSubscriptionCompleted(payload: RazorpayWebhookPayload) {
    const subscription = payload.payload.subscription?.entity;
    if (!subscription) return;

    const clinicId = subscription.notes?.clinic_id;
    if (!clinicId) return;

    // Subscription cycle completed - will auto-renew or expire
    this.logger.log(`Subscription completed for clinic ${clinicId}`);
  }

  // =========================================================================
  // Payment Events (for one-time charges like upgrades)
  // =========================================================================

  private async handlePaymentCaptured(payload: RazorpayWebhookPayload) {
    const payment = payload.payload.payment?.entity;
    if (!payment) return;

    const clinicId = payment.notes?.clinic_id;
    if (!clinicId) return;

    // Check if this is a subscription upgrade payment
    const tier = payment.notes?.tier as ClinicTier | undefined;
    const cycle = payment.notes?.cycle as BillingCycle | undefined;

    if (tier && cycle && payment.order_id) {
      // This is an upgrade/new subscription payment
      await this.billingService.activateSubscription(
        clinicId,
        payment.id,
        payment.order_id,
        '', // Signature verified in webhook
        tier,
        cycle,
      );
    } else {
      // Update any pending payment record
      await this.prisma.subscriptionPayment.updateMany({
        where: {
          razorpayOrderId: payment.order_id,
          status: 'pending',
        },
        data: {
          status: 'paid',
          razorpayPaymentId: payment.id,
          paidAt: new Date(),
        },
      });
    }

    this.logger.log(`Payment captured for clinic ${clinicId}: ${payment.id}`);
  }

  private async handlePaymentFailed(payload: RazorpayWebhookPayload) {
    const payment = payload.payload.payment?.entity;
    if (!payment) return;

    const clinicId = payment.notes?.clinic_id;
    if (!clinicId) return;

    // Update payment record
    await this.prisma.subscriptionPayment.updateMany({
      where: {
        razorpayOrderId: payment.order_id,
        status: 'pending',
      },
      data: {
        status: 'failed',
        failureReason: 'Payment failed',
      },
    });

    this.logger.log(`Payment failed for clinic ${clinicId}: ${payment.id}`);
  }
}
