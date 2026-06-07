import { Inject, Injectable } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { PrismaService } from '@/prisma/prisma.service';
import {
  Prisma,
  ClinicTier,
  SubscriptionStatus,
  BillingCycle,
} from '@workspace/db';
import { addDays } from '@workspace/utils';
import { mapSubscriptionPaymentRow } from './internal-billing-payment.mapper';
import { parseStringEnumMember } from '@workspace/utils';

const CLINIC_TIER_VALUES = Object.values(ClinicTier);
const SUBSCRIPTION_STATUS_VALUES = Object.values(SubscriptionStatus);
const BILLING_CYCLE_VALUES = Object.values(BillingCycle);

interface SubscriptionRow {
  id: string;
  clinicId: string;
  plan: ClinicTier;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  basePriceCents: number;
  currency: string;
  clinic: {
    id: string;
    name: string;
    email: string;
    tier: ClinicTier;
    referralCreditsMonths: number;
  };
}

@Injectable()
export class InternalSubscriptionQueryService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  private subscriptionClinicInclude = {
    clinic: {
      select: {
        id: true,
        name: true,
        email: true,
        tier: true,
        referralCreditsMonths: true,
      },
    },
  } as const;

  private mapSubscriptionRow(s: SubscriptionRow) {
// jscpd:ignore-start
    return {
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
    };
// jscpd:ignore-end
  }

  async getSubscriptions(filters: {
    tier?: string;
    status?: string;
    billingCycle?: string;
  }) {
    const where: Prisma.SubscriptionWhereInput = {};
    if (filters.tier) {
      const tier = parseStringEnumMember(CLINIC_TIER_VALUES, filters.tier);
      if (tier) {
        where.plan = tier;
      }
    }
    if (filters.status) {
      const status = parseStringEnumMember(
        SUBSCRIPTION_STATUS_VALUES,
        filters.status,
      );
      if (status) {
        where.status = status;
      }
    }
    if (filters.billingCycle) {
      const billingCycle = parseStringEnumMember(
        BILLING_CYCLE_VALUES,
        filters.billingCycle,
      );
      if (billingCycle) {
        where.billingCycle = billingCycle;
      }
    }

    const subscriptions = await this.prisma.subscription.findMany({
      where,
      include: this.subscriptionClinicInclude,
      orderBy: { updatedAt: 'desc' },
    });

    return subscriptions.map(this.mapSubscriptionRow);
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
      include: this.subscriptionClinicInclude,
      orderBy: { currentPeriodEnd: 'asc' },
    });

    return subscriptions.map(this.mapSubscriptionRow);
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
