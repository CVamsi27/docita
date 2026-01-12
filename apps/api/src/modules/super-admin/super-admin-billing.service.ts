import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SuperAdminBillingService {
  constructor(private prisma: PrismaService) {}

  // ============================================================================
  // Helper functions (Internal)
  // ============================================================================

  private subDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private startOfMonth(date: Date): Date {
    const result = new Date(date);
    result.setDate(1);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  private formatDate(date: Date, pattern: string): string {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    if (pattern === 'MMM yyyy') {
      return `${months[date.getMonth()]} ${date.getFullYear()}`;
    }
    return date.toISOString();
  }

  // ============================================================================
  // Metrics & Reporting
  // ============================================================================

  async getMetrics() {
    const subscriptions = await this.prisma.subscription.findMany({
      include: {
        clinic: {
          select: {
            id: true,
            name: true,
            email: true,
            tier: true,
            referralCreditsMonths: true,
          },
        },
      },
    });

    const activeSubscriptions = subscriptions.filter(
      (s) => s.status === 'ACTIVE' || s.status === 'TRIALING',
    );

    const mrr = activeSubscriptions.reduce((sum, s) => {
      const monthlyAmount =
        s.billingCycle === 'YEARLY' ? s.basePriceCents / 12 : s.basePriceCents;
      return sum + monthlyAmount;
    }, 0);

    const arr = mrr * 12;

    const thirtyDaysAgo = this.subDays(new Date(), 30);
    const cancelledRecently = subscriptions.filter(
      (s) => s.status === 'CANCELLED' && new Date(s.updatedAt) > thirtyDaysAgo,
    ).length;

    const totalActive = activeSubscriptions.length;
    const churnRate =
      totalActive > 0
        ? cancelledRecently / (totalActive + cancelledRecently)
        : 0;

    const subscriptionsByTier = subscriptions.reduce(
      (acc, s) => {
        acc[s.plan] = (acc[s.plan] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const subscriptionsByStatus = subscriptions.reduce(
      (acc, s) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const sevenDaysFromNow = this.addDays(new Date(), 7);
    const expiringSubscriptions = subscriptions
      .filter(
        (s) =>
          (s.status === 'ACTIVE' || s.status === 'TRIALING') &&
          new Date(s.currentPeriodEnd) <= sevenDaysFromNow &&
          new Date(s.currentPeriodEnd) > new Date(),
      )
      .map((s) => ({
        id: s.id,
        clinicId: s.clinicId,
        tier: s.plan,
        status: s.status,
        billingCycle: s.billingCycle,
        currentPeriodStart: s.currentPeriodStart,
        currentPeriodEnd: s.currentPeriodEnd,
        amount: s.basePriceCents / 100,
        currency: s.currency,
        clinic: s.clinic,
      }));

    const gracePeriodSubscriptions = subscriptions
      .filter((s) => s.status === 'GRACE')
      .map((s) => ({
        id: s.id,
        clinicId: s.clinicId,
        tier: s.plan,
        status: s.status,
        billingCycle: s.billingCycle,
        currentPeriodStart: s.currentPeriodStart,
        currentPeriodEnd: s.currentPeriodEnd,
        amount: s.basePriceCents / 100,
        currency: s.currency,
        clinic: s.clinic,
      }));

    const revenueByMonth: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = this.startOfMonth(this.subDays(new Date(), i * 30));
      const monthEnd = this.startOfMonth(
        this.subDays(new Date(), (i - 1) * 30),
      );

      const payments = await this.prisma.subscriptionPayment.findMany({
        where: {
          status: 'paid',
          paidAt: { gte: monthStart, lt: monthEnd },
        },
      });

      const revenue = payments.reduce((sum, p) => sum + p.amountCents, 0);
      revenueByMonth.push({
        month: this.formatDate(monthStart, 'MMM yyyy'),
        revenue: revenue / 100,
      });
    }

    const recentPayments = await this.prisma.subscriptionPayment.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        subscription: {
          include: {
            clinic: { select: { id: true, name: true } },
          },
        },
      },
    });

    return {
      mrr: mrr / 100,
      arr: arr / 100,
      activeSubscriptions: activeSubscriptions.length,
      trialSubscriptions: subscriptions.filter((s) => s.status === 'TRIALING')
        .length,
      churnRate,
      subscriptionsByTier,
      subscriptionsByStatus,
      expiringSubscriptions,
      gracePeriodSubscriptions,
      revenueByMonth,
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        subscriptionId: p.subscriptionId,
        amount: p.amountCents / 100,
        currency: p.currency,
        status: p.status,
        gatewayPaymentId: p.razorpayPaymentId,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
        subscription: p.subscription
          ? {
              clinic: p.subscription.clinic,
              tier: p.subscription.plan,
            }
          : null,
      })),
    };
  }

  // ============================================================================
  // Subscription Management
  // ============================================================================

  async getSubscriptions(filters: {
    tier?: string;
    status?: string;
    billingCycle?: string;
  }) {
    const where: any = {};
    if (filters.tier) where.plan = filters.tier;
    if (filters.status) where.status = filters.status;
    if (filters.billingCycle) where.billingCycle = filters.billingCycle;

    const subscriptions = await this.prisma.subscription.findMany({
      where,
      include: {
        clinic: {
          select: {
            id: true,
            name: true,
            email: true,
            tier: true,
            referralCreditsMonths: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return subscriptions.map((s) => ({
      id: s.id,
      clinicId: s.clinicId,
      tier: s.plan,
      status: s.status,
      billingCycle: s.billingCycle,
      currentPeriodStart: s.currentPeriodStart,
      currentPeriodEnd: s.currentPeriodEnd,
      amount: s.basePriceCents / 100,
      currency: s.currency,
      clinic: s.clinic,
    }));
  }

  async getExpiringSubscriptions(days?: number) {
    const daysToCheck = days || 7;
    const futureDate = this.addDays(new Date(), daysToCheck);

    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        status: { in: ['ACTIVE', 'TRIALING'] },
        currentPeriodEnd: { lte: futureDate, gte: new Date() },
      },
      include: {
        clinic: {
          select: {
            id: true,
            name: true,
            email: true,
            tier: true,
            referralCreditsMonths: true,
          },
        },
      },
      orderBy: { currentPeriodEnd: 'asc' },
    });

    return subscriptions.map((s) => ({
      id: s.id,
      clinicId: s.clinicId,
      tier: s.plan,
      status: s.status,
      billingCycle: s.billingCycle,
      currentPeriodStart: s.currentPeriodStart,
      currentPeriodEnd: s.currentPeriodEnd,
      amount: s.basePriceCents / 100,
      currency: s.currency,
      clinic: s.clinic,
    }));
  }

  async getPayments(filters: {
    clinicId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const where: any = {};
    if (filters.clinicId) where.clinicId = filters.clinicId;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const payments = await this.prisma.subscriptionPayment.findMany({
      where,
      include: {
        subscription: {
          include: {
            clinic: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return payments.map((p) => ({
      id: p.id,
      subscriptionId: p.subscriptionId,
      amount: p.amountCents / 100,
      currency: p.currency,
      status: p.status,
      gatewayPaymentId: p.razorpayPaymentId,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
      subscription: p.subscription
        ? {
            clinic: p.subscription.clinic,
            tier: p.subscription.plan,
          }
        : null,
    }));
  }

  async sendReminder(subscriptionId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        clinic: { select: { id: true, name: true, email: true } },
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    await this.prisma.subscriptionReminder.create({
      data: {
        clinicId: subscription.clinicId,
        subscriptionId,
        type: 'expiry_7d',
        channel: 'email',
        status: 'sent',
        sentAt: new Date(),
      },
    });

    return { success: true, message: 'Reminder sent successfully' };
  }

  async extendGracePeriod(subscriptionId: string, days: number) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status !== 'GRACE') {
      throw new BadRequestException('Subscription is not in grace period');
    }

    const newEndDate = this.addDays(
      new Date(subscription.currentPeriodEnd),
      days,
    );

    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { currentPeriodEnd: newEndDate },
    });

    return { success: true, message: `Grace period extended by ${days} days` };
  }

  // ============================================================================
  // Payment & Tier Management
  // ============================================================================

  async processPaymentAndUpdateTier(
    clinicId: string,
    data: {
      paymentId: string;
      amount: number;
      currency: string;
      newTier: any;
      paymentMethod: string;
      notes?: string;
    },
  ) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
    });

    if (!clinic) throw new BadRequestException('Clinic not found');

    // Update clinic tier and status
    const updatedClinic = await this.prisma.clinic.update({
      where: { id: clinicId },
      data: {
        tier: data.newTier,
        subscriptionStatus: 'active',
      },
    });

    return {
      success: true,
      payment: {
        paymentId: data.paymentId,
        status: 'completed',
        amount: data.amount,
        currency: data.currency,
        paymentMethod: data.paymentMethod,
        timestamp: new Date(),
      },
      clinic: updatedClinic,
    };
  }

  async getClinicTierInfo(clinicId: string) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: {
        id: true,
        name: true,
        tier: true,
        subscriptionStatus: true,
        intelligenceAddon: true,
      },
    });

    if (!clinic) throw new BadRequestException('Clinic not found');

    return {
      clinic,
      tierInfo: this.getTierDetails(clinic.tier as any),
    };
  }

  async upgradeTier(clinicId: string, newTier: any) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
    });
    if (!clinic) throw new BadRequestException('Clinic not found');

    const updatedClinic = await this.prisma.clinic.update({
      where: { id: clinicId },
      data: { tier: newTier },
    });

    return {
      success: true,
      clinic: updatedClinic,
      message: `Clinic upgraded to ${newTier}`,
    };
  }

  async downgradeTier(clinicId: string, newTier: any) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
    });
    if (!clinic) throw new BadRequestException('Clinic not found');

    const updatedClinic = await this.prisma.clinic.update({
      where: { id: clinicId },
      data: { tier: newTier },
    });

    return {
      success: true,
      clinic: updatedClinic,
      message: `Clinic downgraded to ${newTier}`,
    };
  }

  getTierPricingInfo() {
    const tiers = ['CAPTURE', 'CORE', 'PLUS', 'PRO', 'ENTERPRISE'];
    return tiers.map((tier) => ({
      tier,
      ...this.getTierDetails(tier as any),
    }));
  }

  private getTierDetails(tier: any) {
    const tierDetails: any = {
      CAPTURE: { name: 'Capture', price: 0, maxDoctors: 1, aiEnabled: false },
      CORE: { name: 'Core', price: 4999, maxDoctors: 5, aiEnabled: false },
      PLUS: { name: 'Plus', price: 9999, maxDoctors: 20, aiEnabled: false },
      PRO: { name: 'Pro', price: 24999, maxDoctors: -1, aiEnabled: true },
      ENTERPRISE: {
        name: 'Enterprise',
        price: null,
        maxDoctors: -1,
        aiEnabled: true,
      },
    };
    return tierDetails[tier] || null;
  }
}
