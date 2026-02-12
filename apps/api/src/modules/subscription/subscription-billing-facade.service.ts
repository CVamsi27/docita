/**
 * Subscription Billing Service (Facade)
 * 
 * Orchestrates subscription billing operations by delegating to specialized services:
 * - BillingCalculationService: Pricing and proration math
 * - SubscriptionCheckoutService: Checkout and payment initiation
 * - SubscriptionLifecycleService: State management (activation, cancellation, etc.)
 * - ReferralService: Referral program
 * - BillingHistoryService: History and reporting
 * - ProrationService: Plan change calculations
 * 
 * This service acts as a facade, coordinating operations across multiple domains
 * while keeping each service focused on a single responsibility.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentGatewayFactory } from '../../gateways/payment-gateway.factory';
import { PaymentProvider } from '../../gateways/payment-gateway.interface';
import { ClinicTier, BillingCycle, SubscriptionStatus } from '@workspace/db';

// Import specialized services
import { BillingCalculationService, ProrationPreview } from './billing-calculation.service';
import { SubscriptionCheckoutService, CheckoutResult } from './subscription-checkout.service';
import { SubscriptionLifecycleService } from './subscription-lifecycle.service';
import { ReferralService } from './referral.service';
import { BillingHistoryService } from './billing-history.service';
import { ProrationService } from './proration.service';

const GRACE_PERIOD_DAYS = 3;

@Injectable()
export class SubscriptionBillingService {
  private readonly logger = new Logger(SubscriptionBillingService.name);

  constructor(
    private prisma: PrismaService,
    private gatewayFactory: PaymentGatewayFactory,
    // Specialized services
    private billingCalculation: BillingCalculationService,
    private checkout: SubscriptionCheckoutService,
    private lifecycle: SubscriptionLifecycleService,
    private referral: ReferralService,
    private billingHistory: BillingHistoryService,
    private proration: ProrationService,
  ) {}

  // =========================================================================
  // Public API - Pricing
  // =========================================================================

  /**
   * Get price for a tier and billing cycle
   */
  getPriceCents(
    tier: ClinicTier,
    cycle: BillingCycle,
    addOns: string[] = [],
  ): number {
    return this.billingCalculation.getPriceCents(tier, cycle, addOns);
  }

  /**
   * Get billing cycle days
   */
  getBillingCycleDays(cycle: BillingCycle): number {
    return this.billingCalculation.getBillingCycleDays(cycle);
  }

  // =========================================================================
  // Public API - Checkout & Payment
  // =========================================================================

  /**
   * Create checkout for new subscription or upgrade
   * Handles referral discount application transparently
   */
  async createCheckout(
    clinicId: string,
    tier: ClinicTier,
    cycle: BillingCycle,
    referralCode?: string,
    addOns: string[] = [],
  ): Promise<CheckoutResult> {
    let amountCents = this.billingCalculation.getPriceCents(
      tier,
      cycle,
      addOns,
    );
    let discountApplied = false;

    // Apply referral discount for new subscriptions if provided
    if (referralCode) {
      const clinic = await this.prisma.clinic.findUnique({
        where: { id: clinicId },
        select: { email: true, subscription: true },
      });

      if (clinic && !clinic.subscription) {
        const isValid = await this.referral.validateReferralCode(
          referralCode,
          clinic.email,
        );
        if (isValid) {
          const { finalAmountCents } =
            this.referral.calculateReferralDiscount(amountCents);
          amountCents = finalAmountCents;
          discountApplied = true;
        }
      }
    }

    // For existing subscriptions (upgrades), calculate prorated amount
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      include: { subscription: true },
    });

    if (
      clinic &&
      clinic.subscription &&
      clinic.subscription.status === SubscriptionStatus.ACTIVE
    ) {
      const preview = await this.proration.previewProration(
        clinicId,
        tier,
        cycle,
        addOns,
      );
      amountCents = preview.chargeCents;

      // If it's a downgrade with credits, schedule for next period
      if (amountCents === 0 && preview.creditCents > 0) {
        await this.lifecycle.scheduleDowngrade(clinicId, tier, cycle, addOns);
        return {
          orderId: '',
          amountCents: 0,
          currency: 'INR',
          razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
          subscriptionId: clinic.subscription.id,
        };
      }
    }

    // Create checkout with calculated amount
    return this.checkout.createCheckout(
      clinicId,
      tier,
      cycle,
      amountCents,
      addOns,
    );
  }

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
    await this.lifecycle.activateSubscription(
      clinicId,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
      tier,
      cycle,
      addOns,
    );

    // Apply referral credits if applicable
    await this.referral.applyReferralCreditsOnFirstPayment(clinicId);
  }

  // =========================================================================
  // Public API - Subscription Management
  // =========================================================================

  /**
   * Schedule downgrade for next billing period
   */
  async scheduleDowngrade(
    clinicId: string,
    newTier: ClinicTier,
    newCycle?: BillingCycle,
    addOns: string[] = [],
  ): Promise<void> {
    return this.lifecycle.scheduleDowngrade(clinicId, newTier, newCycle, addOns);
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    clinicId: string,
    cancelAtPeriodEnd: boolean = true,
  ): Promise<void> {
    return this.lifecycle.cancelSubscription(clinicId, cancelAtPeriodEnd);
  }

  /**
   * Enter grace period (called by scheduler on failed renewal)
   */
  async enterGracePeriod(subscriptionId: string): Promise<void> {
    return this.lifecycle.enterGracePeriod(subscriptionId);
  }

  /**
   * Expire subscription after grace period (called by scheduler)
   */
  async expireSubscription(subscriptionId: string): Promise<void> {
    return this.lifecycle.expireSubscription(subscriptionId);
  }

  // =========================================================================
  // Public API - Proration & Previews
  // =========================================================================

  /**
   * Preview proration for plan change
   */
  async previewProration(
    clinicId: string,
    newTier: ClinicTier,
    newCycle?: BillingCycle,
    addOns: string[] = [],
  ): Promise<ProrationPreview> {
    return this.proration.previewProration(clinicId, newTier, newCycle, addOns);
  }

  /**
   * Preview upgrade/downgrade
   */
  async previewUpgrade(
    clinicId: string,
    newTier: ClinicTier,
    newCycle: BillingCycle,
    addOns: string[] = [],
  ): Promise<
    ProrationPreview | { isNewSubscription: boolean; priceCents: number }
  > {
    return this.proration.previewUpgrade(clinicId, newTier, newCycle, addOns);
  }

  // =========================================================================
  // Public API - Billing History & Details
  // =========================================================================

  /**
   * Get payment history
   */
  async getPaymentHistory(clinicId: string, limit: number = 20) {
    return this.billingHistory.getPaymentHistory(clinicId, limit);
  }

  /**
   * Get subscription details
   */
  async getSubscriptionDetails(clinicId: string) {
    return this.billingHistory.getSubscriptionDetails(clinicId);
  }

  /**
   * Get clinic billing details
   */
  async getClinicBillingDetails(clinicId: string) {
    return this.billingHistory.getClinicBillingDetails(clinicId);
  }

  /**
   * Get upcoming invoice
   */
  async getUpcomingInvoice(clinicId: string) {
    return this.billingHistory.getUpcomingInvoice(clinicId);
  }

  // =========================================================================
  // Public API - Payment Methods (Auto-Pay)
  // =========================================================================

  /**
   * Save payment method
   */
  async savePaymentMethod(
    clinicId: string,
    razorpayTokenId: string,
  ): Promise<void> {
    return this.checkout.savePaymentMethod(clinicId, razorpayTokenId);
  }

  /**
   * Get payment method
   */
  async getPaymentMethod(clinicId: string): Promise<string | null> {
    return this.checkout.getPaymentMethod(clinicId);
  }

  /**
   * Set autopay
   */
  async setAutoPay(clinicId: string, enabled: boolean): Promise<void> {
    return this.checkout.setAutoPay(clinicId, enabled);
  }

  // =========================================================================
  // Public API - Referrals
  // =========================================================================

  /**
   * Get referral credits
   */
  async getReferralCredits(clinicId: string) {
    return this.referral.getReferralCredits(clinicId);
  }

  /**
   * Get referral history
   */
  async getReferralHistory(referrerClinicId: string) {
    return this.referral.getReferralHistory(referrerClinicId);
  }

  // =========================================================================
  // Legacy Methods - One-Time Payments (Backward Compatibility)
  // =========================================================================

  /**
   * Create checkout for one-time payment
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
      throw new BadRequestException('Minimum payment amount is ₹100');
    }

    const gateway = this.gatewayFactory.getGateway(PaymentProvider.RAZORPAY);
    const checkoutResult = await gateway.createCheckout({
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
      orderId: checkoutResult.orderId,
      amountCents,
      currency: 'INR',
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    };
  }

  /**
   * Process auto-pay on renewal (called by scheduler)
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
        subscription.basePriceCents,
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
      await this.handleAutoPayFailure(subscriptionId);
      throw error;
    }
  }

  /**
   * Handle failed auto-pay
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
        status: 'PAST_DUE' as any,
      },
    });

    this.logger.log(
      `Subscription ${subscriptionId} entered grace period until ${graceUntil.toISOString()}`,
    );
  }

  /**
   * Retry failed payment
   */
  async retryFailedPayment(subscriptionId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription || subscription.failureRetryCount >= 3) {
      if (subscription) {
        await this.suspendSubscription(subscriptionId);
      }
      return;
    }

    try {
      await this.processAutoPayment(subscriptionId);

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
      this.logger.warn(
        `Auto-pay retry failed for subscription ${subscriptionId}, will retry again`,
      );
    }
  }

  /**
   * Suspend subscription
   */
  async suspendSubscription(subscriptionId: string) {
    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'PAUSED' as any,
        graceUntil: null,
      },
    });

    this.logger.log(
      `Subscription ${subscriptionId} suspended due to non-payment`,
    );
  }
}
