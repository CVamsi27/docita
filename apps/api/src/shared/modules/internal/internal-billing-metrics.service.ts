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
    const now = this.clock.now();
    const activeStatuses = [
      SubscriptionStatus.ACTIVE,
      SubscriptionStatus.TRIALING,
    ];

    // MRR: sum `basePriceCents` for active/trialing subscriptions, annualizing
    // YEARLY cycles in SQL terms instead of loading every row into JS.
    const mrrByCycle = await this.prisma.subscription.groupBy({
      by: ['billingCycle'],
      where: { status: { in: activeStatuses } },
      _sum: { basePriceCents: true },
    });
    const monthlyCents =
      mrrByCycle.find((r) => r.billingCycle === 'MONTHLY')?._sum
        .basePriceCents ?? 0;
    const yearlyCents =
      mrrByCycle.find((r) => r.billingCycle === 'YEARLY')?._sum
        .basePriceCents ?? 0;
    const mrrCents = monthlyCents + yearlyCents / 12;
    const mrr = mrrCents / 100;
    const arr = (mrrCents * 12) / 100;

    const thirtyDaysAgo = subDays(now, 30);
    const [totalActive, trialCount, cancelledRecently] = await Promise.all([
      this.prisma.subscription.count({
        where: { status: { in: activeStatuses } },
      }),
      this.prisma.subscription.count({
        where: { status: SubscriptionStatus.TRIALING },
      }),
      this.prisma.subscription.count({
        where: {
          status: SubscriptionStatus.CANCELLED,
          updatedAt: { gt: thirtyDaysAgo },
        },
      }),
    ]);

    const churnRate =
      totalActive > 0
        ? cancelledRecently / (totalActive + cancelledRecently)
        : 0;

    const [tierGroups, statusGroups] = await Promise.all([
      this.prisma.subscription.groupBy({
        by: ['plan'],
        _count: { _all: true },
      }),
      this.prisma.subscription.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ]);

    const subscriptionsByTier = Object.fromEntries(
      tierGroups.map((g) => [g.plan, g._count._all]),
    );
    const subscriptionsByStatus = Object.fromEntries(
      statusGroups.map((g) => [g.status, g._count._all]),
    );

    const clinicSelect = {
      id: true,
      name: true,
      email: true,
      tier: true,
      referralCreditsMonths: true,
    } as const;

    // Shared by `expiringSubscriptions` and `gracePeriodSubscriptions` below
    // — both project the same subscription row onto the same billing-summary
    // shape, so the projection lives in one place rather than the two lists
    // drifting apart.
    const toBillingSummary = (s: (typeof expiringRows)[number]) => ({
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
    });

    // Bounded by the 7-day window (no unbounded findMany of all rows).
    const sevenDaysFromNow = addDays(now, 7);
    const [expiringRows, graceRows] = await Promise.all([
      this.prisma.subscription.findMany({
        where: {
          status: { in: activeStatuses },
          currentPeriodEnd: { gt: now, lte: sevenDaysFromNow },
        },
        include: { clinic: { select: clinicSelect } },
      }),
      this.prisma.subscription.findMany({
        where: { status: SubscriptionStatus.GRACE },
        include: { clinic: { select: clinicSelect } },
      }),
    ]);
    const expiringSubscriptions = expiringRows.map(toBillingSummary);
    const gracePeriodSubscriptions = graceRows.map(toBillingSummary);

    const currentMonthStart = startOfMonth(now);
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
      mrr,
      arr,
      activeSubscriptions: totalActive,
      trialSubscriptions: trialCount,
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
