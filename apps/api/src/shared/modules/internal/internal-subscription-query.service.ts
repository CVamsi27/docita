import { Inject, Injectable } from '@nestjs/common';
import {
  CLOCK_PORT,
  type IClock,
} from '@/shared/common/ports/clock.port';
import { PrismaService } from '@/prisma/prisma.service';
import {
  Prisma,
  ClinicTier,
  SubscriptionStatus,
  BillingCycle,
} from '@workspace/db';
import { addDays } from '@workspace/utils';
import { mapSubscriptionPaymentRow } from './internal-billing-payment.mapper';

@Injectable()
export class InternalSubscriptionQueryService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async getSubscriptions(filters: {
    tier?: string;
    status?: string;
    billingCycle?: string;
  }) {
    const where: Prisma.SubscriptionWhereInput = {};
    if (filters.tier) where.plan = filters.tier as ClinicTier;
    if (filters.status) where.status = filters.status as SubscriptionStatus;
    if (filters.billingCycle)
      where.billingCycle = filters.billingCycle as BillingCycle;

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
    const now = this.clock.now();
    const futureDate = addDays(now, daysToCheck);

    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
        },
        currentPeriodEnd: { lte: futureDate, gte: now },
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
    const where: Prisma.SubscriptionPaymentWhereInput = {};
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
        clinic: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return payments.map((p) => mapSubscriptionPaymentRow(p));
  }
}
