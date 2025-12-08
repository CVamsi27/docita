/**
 * Subscription Billing Service
 * Handles subscription management, proration, checkout, and activation
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentGatewayFactory } from '../../gateways/payment-gateway.factory';
import { PaymentGateway } from '../../gateways/payment.gateway';
import { PaymentProvider } from '../../gateways/payment-gateway.interface';
import { ClinicTier, BillingCycle, Prisma } from '@workspace/db';
import { TIER_PRICING, ANNUAL_DISCOUNT_PERCENT } from '@workspace/types';

// Constants
const GRACE_PERIOD_DAYS = 3;
const MAX_REFERRAL_CREDITS_PER_YEAR = 12;
const REFERRAL_DISCOUNT_PERCENT = 25;

interface ProratedAmount {
  creditCents: number;
  chargeCents: number;
  daysRemaining: number;
  billingCycleDays: number;
}

interface CheckoutResult {
  orderId: string;
  amountCents: number;
  currency: string;
  razorpayKeyId: string;
  subscriptionId?: string;
  checkoutUrl?: string;
}

interface ProrationPreview {
  currentPlan: string;
  newPlan: string;
  currentPriceCents: number;
  newPriceCents: number;
  creditCents: number;
  chargeCents: number;
  daysRemaining: number;
  effectiveDate: Date;
}

@Injectable()
export class SubscriptionBillingService {
  private readonly logger = new Logger(SubscriptionBillingService.name);

  constructor(
    private prisma: PrismaService,
    private gatewayFactory: PaymentGatewayFactory,
    private paymentGateway: PaymentGateway,
  ) {}

  // =========================================================================
  // Pricing Helpers
  // =========================================================================

  /**
   * Get price in cents (paise) for a tier and billing cycle
   */
  getPriceCents(tier: ClinicTier, cycle: BillingCycle): number {
    const pricing = TIER_PRICING[tier];
    if (!pricing) return 0;

    if (cycle === 'YEARLY') {
      const yearlyPrice = pricing.yearly;
      return typeof yearlyPrice === 'number' ? yearlyPrice * 100 : 0;
    }

    const monthlyPrice = pricing.monthly;
    return typeof monthlyPrice === 'number' ? monthlyPrice * 100 : 0;
  }

  /**
   * Get billing cycle days
   */
  getBillingCycleDays(cycle: BillingCycle): number {
    return cycle === 'YEARLY' ? 365 : 30;
  }

  // =========================================================================
  // Proration Logic
  // =========================================================================

  /**
   * Calculate proration for plan changes
   */
  calculateProration(
    currentPriceCents: number,
    newPriceCents: number,
    billingCycleDays: number,
    daysRemaining: number,
  ): ProratedAmount {
    // Credit for unused portion of current plan
    const creditCents = Math.round(
      (daysRemaining / billingCycleDays) * currentPriceCents,
    );

    // Charge for new plan (prorated)
    const newPlanProrated = Math.round(
      (daysRemaining / billingCycleDays) * newPriceCents,
    );

    // Net charge (could be negative if downgrading)
    const chargeCents = Math.max(0, newPlanProrated - creditCents);

    return {
      creditCents,
      chargeCents,
      daysRemaining,
      billingCycleDays,
    };
  }

  /**
   * Preview proration for a plan change
   */
  async previewProration(
    clinicId: string,
    newTier: ClinicTier,
    newCycle?: BillingCycle,
  ): Promise<ProrationPreview> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { clinicId },
      include: { clinic: true },
    });

    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    const currentCycle = newCycle || subscription.billingCycle;
    const cycleDays = this.getBillingCycleDays(currentCycle);

    const now = new Date();
    const periodEnd = new Date(subscription.currentPeriodEnd);
    const daysRemaining = Math.max(
      0,
      Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    );

    const currentPriceCents = subscription.priceCents;
    const newPriceCents = this.getPriceCents(newTier, currentCycle);

    const proration = this.calculateProration(
      currentPriceCents,
      newPriceCents,
      cycleDays,
      daysRemaining,
    );

    return {
      currentPlan: subscription.plan,
      newPlan: newTier,
      currentPriceCents,
      newPriceCents,
      creditCents: proration.creditCents,
      chargeCents: proration.chargeCents,
      daysRemaining,
      effectiveDate: now,
    };
  }

  // =========================================================================
  // Subscription Creation & Checkout
  // =========================================================================

  /**
   * Create or get Razorpay customer for a clinic
   */
  async ensureRazorpayCustomer(clinicId: string): Promise<string> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      include: {
        users: {
          where: { role: 'ADMIN' },
          take: 1,
        },
      },
    });

    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    // Return existing customer ID if present
    if (clinic.razorpayCustomerId) {
      return clinic.razorpayCustomerId;
    }

    // Create new customer
    const gateway = this.gatewayFactory.getSubscriptionGateway();
    const adminUser = clinic.users[0];

    const { customerId } = await gateway.createCustomer({
      email: clinic.email,
      name: clinic.name,
      phone: clinic.phone,
      notes: {
        clinic_id: clinicId,
        admin_email: adminUser?.email || '',
      },
    });

    // Save customer ID
    await this.prisma.clinic.update({
      where: { id: clinicId },
      data: { razorpayCustomerId: customerId },
    });

    return customerId;
  }

  /**
   * Create checkout for new subscription or upgrade
   */
  async createCheckout(
    clinicId: string,
    tier: ClinicTier,
    cycle: BillingCycle,
    referralCode?: string,
  ): Promise<CheckoutResult> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      include: { subscription: true },
    });

    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    // Ensure customer exists in Razorpay
    const customerId = await this.ensureRazorpayCustomer(clinicId);

    let amountCents = this.getPriceCents(tier, cycle);
    let discountApplied = false;

    // Apply referral discount for new subscriptions
    if (referralCode && !clinic.subscription) {
      const referral = await this.prisma.referral.findFirst({
        where: {
          referralCode,
          referredEmail: clinic.email,
          status: 'SIGNED_UP',
        },
      });

      if (referral && !referral.discountApplied) {
        const discountCents = Math.round(
          amountCents * (REFERRAL_DISCOUNT_PERCENT / 100),
        );
        amountCents = amountCents - discountCents;
        discountApplied = true;
      }
    }

    // Check if this is an upgrade (existing subscription)
    if (clinic.subscription && clinic.subscription.status === 'ACTIVE') {
      const preview = await this.previewProration(clinicId, tier, cycle);
      amountCents = preview.chargeCents;

      // If upgrade results in credit (downgrade), schedule for next period
      if (amountCents === 0 && preview.creditCents > 0) {
        await this.scheduleDowngrade(clinicId, tier, cycle);
        return {
          orderId: '',
          amountCents: 0,
          currency: 'INR',
          razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
          subscriptionId: clinic.subscription.id,
        };
      }
    }

    // Create Razorpay order for checkout
    const gateway = this.gatewayFactory.getSubscriptionGateway();
    const { orderId } = await gateway.createCheckout({
      customerId,
      amountCents,
      currency: 'INR',
      description: `Docita ${tier} - ${cycle === 'YEARLY' ? 'Annual' : 'Monthly'}`,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings?payment=success`,
      notes: {
        clinic_id: clinicId,
        tier,
        cycle,
        discount_applied: discountApplied ? 'true' : 'false',
      },
    });

    // Create pending payment record
    await this.prisma.subscriptionPayment.create({
      data: {
        clinicId,
        subscriptionId: clinic.subscription?.id,
        amountCents,
        currency: 'INR',
        status: 'pending',
        razorpayOrderId: orderId,
        description: `${tier} ${cycle} subscription`,
      },
    });

    return {
      orderId,
      amountCents,
      currency: 'INR',
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
      subscriptionId: clinic.subscription?.id,
    };
  }

  // =========================================================================
  // Subscription Activation & Management
  // =========================================================================

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
  ): Promise<void> {
    const now = new Date();
    const periodEnd = new Date(now);

    if (cycle === 'YEARLY') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const priceCents = this.getPriceCents(tier, cycle);

    // Update or create subscription
    const subscription = await this.prisma.subscription.upsert({
      where: { clinicId },
      create: {
        clinicId,
        plan: tier,
        billingCycle: cycle,
        priceCents,
        currency: 'INR',
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
      update: {
        plan: tier,
        billingCycle: cycle,
        priceCents,
        status: 'ACTIVE',
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

    // Update clinic tier
    await this.prisma.clinic.update({
      where: { id: clinicId },
      data: {
        tier,
        subscriptionStatus: 'active',
      },
    });

    // Apply referral credits if applicable
    await this.applyReferralCreditsOnFirstPayment(clinicId);

    // Emit real-time update
    this.paymentGateway.emitClinicUpdate(clinicId, {
      clinicId,
      tier,
      subscriptionStatus: 'active',
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
        status: cancelAtPeriodEnd ? 'ACTIVE' : 'CANCELLED',
      },
    });

    if (!cancelAtPeriodEnd) {
      // Immediate cancellation - downgrade to CAPTURE
      await this.prisma.clinic.update({
        where: { id: clinicId },
        data: {
          tier: 'CAPTURE',
          subscriptionStatus: 'cancelled',
        },
      });
    }

    this.logger.log(
      `Subscription cancelled for clinic ${clinicId}, at_period_end: ${cancelAtPeriodEnd}`,
    );
  }

  // =========================================================================
  // Referral Credit Management
  // =========================================================================

  /**
   * Apply referral credits after first successful payment
   */
  async applyReferralCreditsOnFirstPayment(clinicId: string): Promise<void> {
    // Check if this is the first payment
    const paymentCount = await this.prisma.subscriptionPayment.count({
      where: {
        clinicId,
        status: 'paid',
      },
    });

    if (paymentCount > 1) {
      return; // Not first payment
    }

    // Find pending referral for this clinic
    const referral = await this.prisma.referral.findFirst({
      where: {
        referredClinicId: clinicId,
        status: 'SIGNED_UP',
        creditApplied: false,
      },
      include: {
        referrerClinic: true,
      },
    });

    if (!referral) {
      return;
    }

    // Check referrer's credit cap
    const referrerCredits = referral.referrerClinic.referralCreditsMonths || 0;
    if (referrerCredits >= MAX_REFERRAL_CREDITS_PER_YEAR) {
      this.logger.warn(
        `Referrer ${referral.referrerClinicId} has reached credit cap`,
      );
      return;
    }

    // Apply credit to referrer
    await this.prisma.$transaction([
      // Update referrer's credit months
      this.prisma.clinic.update({
        where: { id: referral.referrerClinicId },
        data: {
          referralCreditsMonths: {
            increment: 1,
          },
        },
      }),
      // Create credit record
      this.prisma.referralCredit.create({
        data: {
          clinicId: referral.referrerClinicId,
          referralId: referral.id,
          creditMonths: 1,
        },
      }),
      // Update referral status
      this.prisma.referral.update({
        where: { id: referral.id },
        data: {
          status: 'CONVERTED',
          creditApplied: true,
          convertedAt: new Date(),
        },
      }),
    ]);

    this.logger.log(
      `Applied referral credit to clinic ${referral.referrerClinicId} from referral ${referral.id}`,
    );
  }

  // =========================================================================
  // Grace Period & Expiry
  // =========================================================================

  /**
   * Handle subscription entering grace period
   */
  async enterGracePeriod(subscriptionId: string): Promise<void> {
    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: 'GRACE' },
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
        data: { status: 'EXPIRED' },
      }),
      // Downgrade clinic to CAPTURE
      this.prisma.clinic.update({
        where: { id: subscription.clinicId },
        data: {
          tier: 'CAPTURE',
          subscriptionStatus: 'expired',
        },
      }),
    ]);

    // Emit real-time update
    this.paymentGateway.emitClinicUpdate(subscription.clinicId, {
      clinicId: subscription.clinicId,
      tier: 'CAPTURE',
      subscriptionStatus: 'expired',
    });

    this.logger.log(`Subscription expired for clinic ${subscription.clinicId}`);
  }

  // =========================================================================
  // Billing History
  // =========================================================================

  /**
   * Get payment history for a clinic
   */
  async getPaymentHistory(clinicId: string, limit: number = 20) {
    return this.prisma.subscriptionPayment.findMany({
      where: { clinicId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get subscription details
   */
  async getSubscriptionDetails(clinicId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { clinicId },
      include: {
        clinic: {
          select: {
            id: true,
            name: true,
            tier: true,
            referralCreditsMonths: true,
          },
        },
        payments: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!subscription) {
      return null;
    }

    const now = new Date();
    const periodEnd = new Date(subscription.currentPeriodEnd);
    const daysRemaining = Math.max(
      0,
      Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    );

    return {
      ...subscription,
      daysRemaining,
      isInGrace: subscription.status === 'GRACE',
      graceDaysRemaining:
        subscription.status === 'GRACE'
          ? Math.max(
              0,
              GRACE_PERIOD_DAYS -
                Math.ceil(
                  (now.getTime() - periodEnd.getTime()) / (1000 * 60 * 60 * 24),
                ),
            )
          : null,
    };
  }

  // =========================================================================
  // Additional Billing Methods
  // =========================================================================

  /**
   * Preview upgrade/downgrade proration
   */
  async previewUpgrade(
    clinicId: string,
    newTier: ClinicTier,
    newCycle: BillingCycle,
  ): Promise<
    ProrationPreview | { isNewSubscription: boolean; priceCents: number }
  > {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
    });

    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { clinicId },
    });

    // If no active subscription, return new subscription price
    if (!subscription || subscription.status !== 'ACTIVE') {
      return {
        isNewSubscription: true,
        priceCents: this.getPriceCents(newTier, newCycle),
      };
    }

    // Calculate proration for existing subscription
    return this.previewProration(clinicId, newTier, newCycle);
  }

  /**
   * Get billing details for a clinic
   */
  async getClinicBillingDetails(clinicId: string) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
    });

    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { clinicId },
    });

    const now = new Date();
    let daysRemaining = 0;
    let isInGrace = false;
    let graceDaysRemaining = 0;

    if (subscription) {
      const periodEnd = new Date(subscription.currentPeriodEnd);
      daysRemaining = Math.max(
        0,
        Math.ceil(
          (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        ),
      );
      isInGrace = subscription.status === 'GRACE';
      if (isInGrace) {
        graceDaysRemaining = Math.max(
          0,
          GRACE_PERIOD_DAYS -
            Math.ceil(
              (now.getTime() - periodEnd.getTime()) / (1000 * 60 * 60 * 24),
            ),
        );
      }
    }

    return {
      clinic: {
        id: clinic.id,
        name: clinic.name,
        tier: clinic.tier,
        subscriptionStatus: clinic.subscriptionStatus,
      },
      subscription: subscription
        ? {
            id: subscription.id,
            plan: subscription.plan,
            billingCycle: subscription.billingCycle,
            status: subscription.status,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
            priceCents: subscription.priceCents,
            currency: subscription.currency,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            scheduledChange: subscription.scheduledChange,
          }
        : null,
      daysRemaining,
      isInGrace,
      graceDaysRemaining,
    };
  }

  /**
   * Get upcoming invoice preview
   */
  async getUpcomingInvoice(clinicId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { clinicId },
    });

    if (!subscription) {
      return null;
    }

    // Check if cancelled
    if (subscription.cancelAtPeriodEnd) {
      return {
        message: 'Subscription will not renew',
        expiresAt: subscription.currentPeriodEnd,
      };
    }

    // Check for scheduled change
    if (subscription.scheduledChange) {
      const change = subscription.scheduledChange as any;
      const newPrice = this.getPriceCents(change.plan, change.billingCycle);
      return {
        nextBillingDate: subscription.currentPeriodEnd,
        plan: change.plan,
        billingCycle: change.billingCycle,
        amountCents: newPrice,
        currency: subscription.currency,
        isChanged: true,
      };
    }

    return {
      nextBillingDate: subscription.currentPeriodEnd,
      plan: subscription.plan,
      billingCycle: subscription.billingCycle,
      amountCents: subscription.priceCents,
      currency: subscription.currency,
      isChanged: false,
    };
  }

  // =========================================================================
  // Payment Method Management (Auto-Pay)
  // =========================================================================

  /**
   * Save payment method (Razorpay token for auto-pay)
   */
  async savePaymentMethod(
    clinicId: string,
    razorpayTokenId: string,
    methodType: 'CARD' | 'BANK_TRANSFER',
  ) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { clinicId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Update subscription with token and method type
    const updated = await this.prisma.subscription.update({
      where: { clinicId },
      data: {
        razorpayTokenId,
        paymentMethodType: methodType,
      },
    });

    return {
      success: true,
      methodType: updated.paymentMethodType,
      message: `Payment method saved as ${methodType}`,
    };
  }

  /**
   * Get saved payment method
   */
  async getPaymentMethod(clinicId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { clinicId },
    });

    if (!subscription || !subscription.razorpayTokenId) {
      return {
        saved: false,
        methodType: null,
      };
    }

    // Mask token for security
    const maskedToken = `****${subscription.razorpayTokenId?.slice(-4)}`;

    return {
      saved: true,
      methodType: subscription.paymentMethodType,
      maskedToken,
    };
  }

  /**
   * Enable or disable auto-pay
   */
  async setAutoPay(clinicId: string, enabled: boolean) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { clinicId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (enabled && !subscription.razorpayTokenId) {
      throw new BadRequestException(
        'Payment method must be saved before enabling auto-pay',
      );
    }

    const updated = await this.prisma.subscription.update({
      where: { clinicId },
      data: {
        autoPayEnabled: enabled,
      },
    });

    return {
      success: true,
      autoPayEnabled: updated.autoPayEnabled,
      message: enabled ? 'Auto-pay enabled' : 'Auto-pay disabled',
    };
  }

  /**
   * Create payment checkout for one-time payments
   */
  async createPaymentCheckout(
    clinicId: string,
    amountCents: number,
    description?: string,
  ) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { id: true, name: true, email: true },
    });

    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    if (amountCents < 10000) {
      // Minimum 100 INR
      throw new BadRequestException('Minimum payment amount is ₹100');
    }

    const gateway = this.gatewayFactory.getGateway(PaymentProvider.RAZORPAY);
    const checkout = await gateway.createCheckout({
      amountCents,
      currency: 'INR',
      customerId: clinicId,
      description: description || 'One-time payment',
      callbackUrl: `${process.env.APP_URL || 'http://localhost:3000'}/api/payment/callback`,
      notes: {
        clinicId,
        clinicName: clinic.name,
        description: description || 'One-time payment',
      },
    });

    return {
      orderId: checkout.orderId,
      amountCents,
      currency: 'INR',
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    };
  }

  /**
   * Process auto-pay on renewal date (called by scheduler)
   */
  async processAutoPayment(subscriptionId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { clinic: true },
    });

    if (
      !subscription ||
      !subscription.autoPayEnabled ||
      !subscription.razorpayTokenId ||
      !subscription.razorpayCustomerId
    ) {
      this.logger.warn(
        `Auto-pay not available for subscription ${subscriptionId}`,
      );
      return;
    }

    try {
      const gateway = this.gatewayFactory.getGateway(PaymentProvider.RAZORPAY);
      const payment = await (gateway as any).chargeWithToken(
        subscription.razorpayCustomerId,
        subscription.razorpayTokenId,
        subscription.priceCents,
        subscription.currency,
        `Auto-pay renewal for ${subscription.clinic.name}`,
      );

      this.logger.log(
        `Auto-pay processed for subscription ${subscriptionId}: ${payment.paymentId}`,
      );

      return payment;
    } catch (error) {
      this.logger.error(
        `Auto-pay failed for subscription ${subscriptionId}`,
        error,
      );

      // Mark for retry with grace period
      await this.handleAutoPayFailure(subscriptionId);
      throw error;
    }
  }

  /**
   * Handle failed auto-pay (enter grace period)
   */
  async handleAutoPayFailure(subscriptionId: string) {
    const graceUntil = new Date();
    graceUntil.setDate(graceUntil.getDate() + GRACE_PERIOD_DAYS);

    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        lastFailedPaymentDate: new Date(),
        failureRetryCount: {
          increment: 1,
        },
        graceUntil,
        status: 'PAST_DUE',
      },
    });

    this.logger.log(
      `Subscription ${subscriptionId} entered grace period until ${graceUntil.toISOString()}`,
    );
  }

  /**
   * Retry failed payment (called by scheduler during grace period)
   */
  async retryFailedPayment(subscriptionId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription || subscription.failureRetryCount >= 3) {
      // Max 3 retries before suspension
      if (subscription) {
        await this.suspendSubscription(subscriptionId);
      }
      return;
    }

    try {
      await this.processAutoPayment(subscriptionId);

      // On success, reset to active
      await this.prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'ACTIVE',
          failureRetryCount: 0,
          lastFailedPaymentDate: null,
          graceUntil: null,
        },
      });

      this.logger.log(
        `Auto-pay retry successful for subscription ${subscriptionId}`,
      );
    } catch (error) {
      // Retry again in 12 hours
      this.logger.warn(
        `Auto-pay retry failed for subscription ${subscriptionId}, will retry again`,
      );
    }
  }

  /**
   * Suspend subscription when grace period expires
   */
  async suspendSubscription(subscriptionId: string) {
    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'PAUSED',
        graceUntil: null,
      },
    });

    this.logger.log(
      `Subscription ${subscriptionId} suspended due to non-payment`,
    );
  }
}
