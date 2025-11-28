import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Billing Service
 *
 * This service handles billing operations.
 * In production, this would integrate with Stripe for payment processing.
 * Currently provides placeholder responses until Stripe integration is complete.
 */
@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get billing portal URL
   * In production: Creates a Stripe Customer Portal session
   */
  async getBillingPortalUrl(
    clinicId: string,
  ): Promise<{ url: string | null; message?: string }> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: {
        id: true,
        name: true,
        tier: true,
        subscriptionStatus: true,
      },
    });

    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    // In production with Stripe integration:
    // 1. Check if clinic has stripeCustomerId in settings JSON
    // 2. Create Stripe billing portal session
    // 3. Return the session URL

    // For now, return helpful message
    return {
      url: null,
      message:
        'Billing portal is being set up. Please contact support@docita.in for billing inquiries.',
    };
  }

  /**
   * Get invoices for a clinic
   * In production: Fetches invoices from Stripe
   */
  async getInvoices(clinicId: string) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: {
        tier: true,
        createdAt: true,
      },
    });

    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    // Return empty array until Stripe integration
    return [];
  }

  /**
   * Get payment methods for a clinic
   * In production: Fetches payment methods from Stripe
   */
  async getPaymentMethods(clinicId: string) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: {
        id: true,
      },
    });

    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    // Return empty array until Stripe integration
    return [];
  }

  /**
   * Create a checkout session for subscription upgrade
   * In production: Creates a Stripe Checkout session
   */
  async createCheckoutSession(clinicId: string) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: {
        id: true,
        email: true,
        tier: true,
      },
    });

    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    // For now, return message
    return {
      url: null,
      message:
        'Payment integration coming soon. Contact support@docita.in to upgrade.',
    };
  }
}
