import { Inject, Injectable } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { PrismaService } from '@/prisma/prisma.service';
import { SubscriptionStatus } from '@workspace/db';
import {
  INTERNAL_SUBSCRIPTION_PAYMENT_REPOSITORY_TOKEN,
  type InternalSubscriptionPaymentRepository,
} from '@/shared/modules/internal/ports/internal-subscription-payment.repository.port';
import {
  addDays,
  addMonths,
  formatDate,
  startOfMonth,
  subDays,
} from '@workspace/utils';
import { mapSubscriptionPaymentRow } from './internal-billing-payment.mapper';

@Injectable()
export class InternalBillingMetricsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(INTERNAL_SUBSCRIPTION_PAYMENT_REPOSITORY_TOKEN)
    private readonly subscriptionPayments: InternalSubscriptionPaymentRepository,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

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
      (s) =>
        s.status === SubscriptionStatus.ACTIVE ||
        s.status === SubscriptionStatus.TRIALING,
    );

    const mrr = activeSubscriptions.reduce((sum, s) => {
      const monthlyAmount =
        s.billingCycle === 'YEARLY' ? s.basePriceCents / 12 : s.basePriceCents;
      return sum + monthlyAmount;
    }, 0);

    const arr = mrr * 12;

    const thirtyDaysAgo = subDays(this.clock.now(), 30);
    const cancelledRecently = subscriptions.filter(
      (s) =>
        s.status === SubscriptionStatus.CANCELLED &&
        new Date(s.updatedAt) > thirtyDaysAgo,
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

    const sevenDaysFromNow = addDays(this.clock.now(), 7);
    const expiringSubscriptions = subscriptions
      .filter(
        (s) =>
          (s.status === SubscriptionStatus.ACTIVE ||
            s.status === SubscriptionStatus.TRIALING) &&
          new Date(s.currentPeriodEnd) <= sevenDaysFromNow &&
          new Date(s.currentPeriodEnd) > this.clock.now(),
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
      .filter((s) => s.status === SubscriptionStatus.GRACE)
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

    const currentMonthStart = startOfMonth(this.clock.now());
    const firstMonthStart = addMonths(currentMonthStart, -5);
    const nextMonthStart = addMonths(currentMonthStart, 1);

    const groupedRevenue =
      await this.subscriptionPayments.getPaidRevenueGroupedByMonth(
        firstMonthStart,
        nextMonthStart,
      );

    const revenueByMonthMap = new Map<string, number>();
    for (const row of groupedRevenue) {
      const monthKey = row.monthStart.toISOString().slice(0, 7);
      revenueByMonthMap.set(monthKey, Number(row.revenueCents));
    }

    const revenueByMonth: { month: string; revenue: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const monthStart = addMonths(firstMonthStart, i);
      const monthKey = monthStart.toISOString().slice(0, 7);
      revenueByMonth.push({
        month: formatDate(monthStart, 'MMM yyyy'),
        revenue: (revenueByMonthMap.get(monthKey) ?? 0) / 100,
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
        clinic: { select: { id: true, name: true } },
      },
    });

    return {
      mrr: mrr / 100,
      arr: arr / 100,
      activeSubscriptions: activeSubscriptions.length,
      trialSubscriptions: subscriptions.filter(
        (s) => s.status === SubscriptionStatus.TRIALING,
      ).length,
      churnRate,
      subscriptionsByTier,
      subscriptionsByStatus,
      expiringSubscriptions,
      gracePeriodSubscriptions,
      revenueByMonth,
      recentPayments: recentPayments.map((p) => mapSubscriptionPaymentRow(p)),
    };
  }
}
