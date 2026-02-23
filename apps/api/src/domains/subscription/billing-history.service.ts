/**
 * Billing History Service
 *
 * Handles billing history and invoice retrieval:
 * - Payment history
 * - Subscription details
 * - Upcoming invoices
 * - Billing information
 *
 * Single Responsibility: Billing data retrieval and history management
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BillingCalculationService } from './billing-calculation.service';

const GRACE_PERIOD_DAYS = 3;

@Injectable()
export class BillingHistoryService {
  private readonly logger = new Logger(BillingHistoryService.name);

  constructor(
    private prisma: PrismaService,
    private billingCalculation: BillingCalculationService,
  ) {}

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
   * Get subscription details with computed fields
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

    const daysRemaining = this.billingCalculation.calculateDaysRemaining(
      subscription.currentPeriodEnd,
    );
    const isInGrace = subscription.status === 'GRACE';
    const graceDaysRemaining = isInGrace
      ? this.billingCalculation.calculateGracePeriodDaysRemaining(
          subscription.currentPeriodEnd,
          GRACE_PERIOD_DAYS,
        )
      : null;

    return {
      ...subscription,
      daysRemaining,
      isInGrace,
      graceDaysRemaining,
    };
  }

  /**
   * Get upcoming invoice details
   */
  async getUpcomingInvoice(clinicId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { clinicId },
    });

    if (!subscription) {
      throw new NotFoundException('No subscription found');
    }

    const daysRemaining = this.billingCalculation.calculateDaysRemaining(
      subscription.currentPeriodEnd,
    );

    let upcomingTier = subscription.plan;
    let upcomingCycle = subscription.billingCycle;
    let upcomingPrice = subscription.basePriceCents;

    // If scheduled change, use that instead
    if (subscription.scheduledChange) {
      const change = subscription.scheduledChange as any;
      upcomingTier = change.plan || upcomingTier;
      upcomingCycle = change.billingCycle || upcomingCycle;
      upcomingPrice = this.billingCalculation.getPriceCents(
        upcomingTier,
        upcomingCycle,
      );
    }

    // If cancel is scheduled
    if (subscription.cancelAtPeriodEnd) {
      return {
        type: 'CANCELLATION',
        daysRemaining,
        effectiveDate: subscription.currentPeriodEnd,
        message: 'Your subscription will be cancelled at the end of the period',
      };
    }

    return {
      type: 'RENEWAL',
      tier: upcomingTier,
      cycle: upcomingCycle,
      amountCents: upcomingPrice,
      daysRemaining,
      effectiveDate: subscription.currentPeriodEnd,
    };
  }

  /**
   * Get clinic billing details including subscription and credits
   */
  async getClinicBillingDetails(clinicId: string) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: {
        id: true,
        name: true,
        tier: true,
        subscriptionStatus: true,
        referralCreditsMonths: true,
        subscription: true,
      },
    });

    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    const subscription = clinic.subscription;
    if (!subscription) {
      return {
        clinic: {
          id: clinic.id,
          name: clinic.name,
          tier: clinic.tier,
          subscriptionStatus: clinic.subscriptionStatus,
        },
        subscription: null,
        billing: null,
      };
    }

    const daysRemaining = this.billingCalculation.calculateDaysRemaining(
      subscription.currentPeriodEnd,
    );
    const isInGrace = subscription.status === 'GRACE';
    const graceDaysRemaining = isInGrace
      ? this.billingCalculation.calculateGracePeriodDaysRemaining(
          subscription.currentPeriodEnd,
          GRACE_PERIOD_DAYS,
        )
      : null;

    return {
      clinic: {
        id: clinic.id,
        name: clinic.name,
        tier: clinic.tier,
        subscriptionStatus: clinic.subscriptionStatus,
      },
      subscription: {
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        billingCycle: subscription.billingCycle,
        basePriceCents: subscription.basePriceCents,
        daysRemaining,
        isInGrace,
        graceDaysRemaining,
      },
      billing: {
        creditMonths: clinic.referralCreditsMonths,
        cancelledAt: subscription.cancelledAt,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        scheduledChange: subscription.scheduledChange,
      },
    };
  }

  /**
   * Get payment statistics for reporting
   */
  async getPaymentStats(clinicId: string, monthsBack: number = 12) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);

    const payments = await this.prisma.subscriptionPayment.findMany({
      where: {
        clinicId,
        status: 'paid',
        paidAt: {
          gte: startDate,
        },
      },
      orderBy: { paidAt: 'desc' },
    });

    const totalPaidCents = payments.reduce((sum, p) => sum + p.amountCents, 0);
    const paymentCount = payments.length;
    const averagePaymentCents =
      paymentCount > 0 ? Math.round(totalPaidCents / paymentCount) : 0;

    return {
      totalPaidCents,
      paymentCount,
      averagePaymentCents,
      payments,
    };
  }
}
