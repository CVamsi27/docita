/**
 * Subscription Lifecycle Service
 *
 * Handles subscription state management:
 * - Activation
 * - Cancellation
 * - Downgrade scheduling
 * - Grace period management
 * - Expiration
 *
 * Single Responsibility: Subscription state transitions and lifecycle events
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentGatewayFactory } from '../../gateways/payment-gateway.factory';
import { PaymentWebSocketGateway } from '../../gateways/payment.websocket.gateway';
import {
  ClinicTier,
  BillingCycle,
  SubscriptionStatus,
  Prisma,
} from '@workspace/db';
import { Feature } from '@workspace/types';
import { BillingCalculationService } from './billing-calculation.service';

const GRACE_PERIOD_DAYS = 3;

@Injectable()
export class SubscriptionLifecycleService {
  private readonly logger = new Logger(SubscriptionLifecycleService.name);

  constructor(
    private prisma: PrismaService,
    private gatewayFactory: PaymentGatewayFactory,
    private paymentGateway: PaymentWebSocketGateway,
    private billingCalculation: BillingCalculationService,
  ) {}

  /**
   * Activate subscription after successful payment
   */
  async activateSubscription(
    clinicId: string,
    razorpayPaymentId: string,
    razorpayOrderId: string,
    razorpaySignature: string,
    tier: ClinicTier,
    cycle: BillingCycle,
    addOns: string[] = [],
  ): Promise<void> {
    const now = new Date();
    const periodEnd = new Date(now);

    if (cycle === 'YEARLY') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const priceCents = this.billingCalculation.getPriceCents(
      tier,
      cycle,
      addOns,
    );

    // Update or create subscription
    const subscription = await this.prisma.subscription.upsert({
      where: { clinicId },
      create: {
        clinicId,
        plan: tier,
        billingCycle: cycle,
        basePriceCents: priceCents,
        currency: 'INR',
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
      update: {
        plan: tier,
        billingCycle: cycle,
        basePriceCents: priceCents,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        scheduledChange: Prisma.DbNull,
      },
    });

    // Update payment record
    await this.prisma.subscriptionPayment.updateMany({
      where: {
        razorpayOrderId,
        status: 'pending',
      },
      data: {
        status: 'paid',
        razorpayPaymentId,
        razorpaySignature,
        paidAt: now,
        subscriptionId: subscription.id,
      },
    });

    // Update clinic tier and add-on features
    const featureUpdates: Record<string, boolean> = {};
    if (addOns.includes('WHATSAPP')) {
      featureUpdates['WHATSAPP'] = true;
      featureUpdates[Feature.PAYMENT_LINKS] = true;
      featureUpdates['WHATSAPP_REMINDERS'] = true;
    }

    await this.prisma.clinic.update({
      where: { id: clinicId },
      data: {
        tier,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        features: {
          ...featureUpdates,
        },
      },
    });

    // Emit real-time update
    this.paymentGateway.emitClinicUpdate(clinicId, {
      clinicId,
      tier,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
    });

    this.logger.log(
      `Subscription activated for clinic ${clinicId}: ${tier} ${cycle}`,
    );
  }

  /**
   * Schedule a downgrade for next billing period
   */
  async scheduleDowngrade(
    clinicId: string,
    newTier: ClinicTier,
    newCycle?: BillingCycle,
    addOns: string[] = [],
  ): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { clinicId },
    });

    if (!subscription) {
      throw new NotFoundException('No subscription found');
    }

    await this.prisma.subscription.update({
      where: { clinicId },
      data: {
        scheduledChange: {
          plan: newTier,
          billingCycle: newCycle || subscription.billingCycle,
          effectiveAt: subscription.currentPeriodEnd.toISOString(),
        },
      },
    });

    this.logger.log(
      `Scheduled downgrade for clinic ${clinicId} to ${newTier} at ${subscription.currentPeriodEnd.toISOString()}`,
    );
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    clinicId: string,
    cancelAtPeriodEnd: boolean = true,
  ): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { clinicId },
    });

    if (!subscription) {
      throw new NotFoundException('No subscription found');
    }

    // If has Razorpay subscription, cancel there too
    if (subscription.razorpaySubscriptionId) {
      const gateway = this.gatewayFactory.getSubscriptionGateway();
      await gateway.cancelSubscription({
        subscriptionId: subscription.razorpaySubscriptionId,
        cancelAtPeriodEnd,
      });
    }

    await this.prisma.subscription.update({
      where: { clinicId },
      data: {
        cancelAtPeriodEnd,
        cancelledAt: new Date(),
        status: cancelAtPeriodEnd
          ? SubscriptionStatus.ACTIVE
          : SubscriptionStatus.CANCELLED,
      },
    });

    if (!cancelAtPeriodEnd) {
      // Immediate cancellation - downgrade to CAPTURE
      await this.prisma.clinic.update({
        where: { id: clinicId },
        data: {
          tier: 'CAPTURE',
          subscriptionStatus: SubscriptionStatus.CANCELLED,
        },
      });
    }

    this.logger.log(
      `Subscription cancelled for clinic ${clinicId}, at_period_end: ${cancelAtPeriodEnd}`,
    );
  }

  /**
   * Handle subscription entering grace period
   */
  async enterGracePeriod(subscriptionId: string): Promise<void> {
    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: SubscriptionStatus.GRACE },
    });
  }

  /**
   * Handle subscription expiry after grace period
   */
  async expireSubscription(subscriptionId: string): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { clinic: true },
    });

    if (!subscription) return;

    await this.prisma.$transaction([
      // Update subscription status
      this.prisma.subscription.update({
        where: { id: subscriptionId },
        data: { status: SubscriptionStatus.EXPIRED },
      }),
      // Downgrade clinic to CAPTURE
      this.prisma.clinic.update({
        where: { id: subscription.clinicId },
        data: {
          tier: 'CAPTURE',
          subscriptionStatus: SubscriptionStatus.EXPIRED,
        },
      }),
    ]);

    // Emit real-time update
    this.paymentGateway.emitClinicUpdate(subscription.clinicId, {
      clinicId: subscription.clinicId,
      tier: 'CAPTURE',
      subscriptionStatus: SubscriptionStatus.EXPIRED,
    });

    this.logger.log(`Subscription expired for clinic ${subscription.clinicId}`);
  }
}
