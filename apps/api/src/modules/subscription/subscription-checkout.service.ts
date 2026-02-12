/**
 * Subscription Checkout Service
 * 
 * Handles checkout creation and payment initiation:
 * - Razorpay customer management
 * - Order creation
 * - Checkout initialization
 * - Payment method management
 * 
 * Single Responsibility: Checkout flow management and payment initiation
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentGatewayFactory } from '../../gateways/payment-gateway.factory';
import { ClinicTier, BillingCycle, SubscriptionStatus } from '@workspace/db';
import { BillingCalculationService } from './billing-calculation.service';

export interface CheckoutResult {
  orderId: string;
  amountCents: number;
  currency: string;
  razorpayKeyId: string;
  subscriptionId?: string;
  checkoutUrl?: string;
}

@Injectable()
export class SubscriptionCheckoutService {
  private readonly logger = new Logger(SubscriptionCheckoutService.name);

  constructor(
    private prisma: PrismaService,
    private gatewayFactory: PaymentGatewayFactory,
    private billingCalculation: BillingCalculationService,
  ) {}

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
   * 
   * Note: This is a public method but handles referrals - referral application is handled
   * by ReferralService in a separate layer for better separation of concerns
   */
  async createCheckout(
    clinicId: string,
    tier: ClinicTier,
    cycle: BillingCycle,
    amountCentsOverride?: number,
    addOns: string[] = [],
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

    let amountCents =
      amountCentsOverride || this.billingCalculation.getPriceCents(tier, cycle, addOns);

    // Check if this is an upgrade (existing subscription)
    let subscriptionId = clinic.subscription?.id;
    if (
      clinic.subscription &&
      clinic.subscription.status === SubscriptionStatus.ACTIVE
    ) {
      // For upgrades, the amountCents should already be calculated as prorated charge by caller
      // No additional processing needed here
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
        addOns: addOns.join(','),
      },
    });

    // Create pending payment record
    await this.prisma.subscriptionPayment.create({
      data: {
        clinicId,
        subscriptionId,
        amountCents,
        currency: 'INR',
        status: 'pending',
        razorpayOrderId: orderId,
        description: `${tier} ${cycle} subscription${addOns.length ? ` + ${addOns.join(', ')}` : ''}`,
      },
    });

    return {
      orderId,
      amountCents,
      currency: 'INR',
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
      subscriptionId,
    };
  }

  /**
   * Save payment method for a clinic
   */
  async savePaymentMethod(
    clinicId: string,
    razorpayTokenId: string,
  ): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { clinicId },
    });

    if (!subscription) {
      throw new NotFoundException('No subscription found');
    }

    await this.prisma.subscription.update({
      where: { clinicId },
      data: { razorpayTokenId },
    });

    this.logger.log(`Saved payment method for clinic ${clinicId}`);
  }

  /**
   * Get saved payment method for a clinic
   */
  async getPaymentMethod(clinicId: string): Promise<string | null> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { clinicId },
    });

    if (!subscription || !subscription.razorpayTokenId) {
      return null;
    }

    return subscription.razorpayTokenId;
  }

  /**
   * Enable/disable autopay for a clinic
   */
  async setAutoPay(clinicId: string, enabled: boolean): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { clinicId },
    });

    if (!subscription) {
      throw new NotFoundException('No subscription found');
    }

    if (enabled && !subscription.razorpayTokenId) {
      throw new BadRequestException(
        'Payment method required to enable autopay',
      );
    }

    await this.prisma.subscription.update({
      where: { clinicId },
      data: { autoPayEnabled: enabled },
    });

    this.logger.log(
      `Autopay ${enabled ? 'enabled' : 'disabled'} for clinic ${clinicId}`,
    );
  }
}
