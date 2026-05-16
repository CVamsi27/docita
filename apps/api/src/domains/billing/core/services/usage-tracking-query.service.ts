import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UsageType, ClinicTier, Role } from '@workspace/db';
import { DEFAULT_CURRENCY } from '@workspace/utils';
import {
  PRICING_CURRENCY_CONFIG,
  TIER_LIMITS,
  TIER_OVERAGE_RATES_BY_CURRENCY,
  getWhatsAppAddonPricingByCurrency,
  type TierName,
  type SupportedCurrency,
} from '@workspace/types';

@Injectable()
export class UsageTrackingQueryService {
  constructor(private prisma: PrismaService) {}

  resolveCurrency(currency?: string): SupportedCurrency {
    const selected = currency?.toUpperCase() as SupportedCurrency | undefined;
    if (
      selected &&
      Object.prototype.hasOwnProperty.call(PRICING_CURRENCY_CONFIG, selected)
    ) {
      return selected;
    }
    return DEFAULT_CURRENCY as SupportedCurrency;
  }

  async getCurrentUsage(clinicId: string) {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
    );

    const subscription = await this.prisma.subscription.findUnique({
      where: { clinicId },
      select: {
        plan: true,
        includedAppointments: true,
        includedUsers: true,
        currency: true,
      },
    });

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { tier: true },
    });

    const [
      consultations,
      whatsappMessages,
      activeUsers,
      maxUsersEvent,
      maxUsersRecord,
    ] = await Promise.all([
      this.prisma.appointment.count({
        where: {
          clinicId,
          status: 'COMPLETED',
          updatedAt: { gte: periodStart, lte: periodEnd },
        },
      }),
      this.prisma.usageEvent.aggregate({
        where: {
          clinicId,
          type: 'WHATSAPP_MESSAGES',
          timestamp: { gte: periodStart, lte: periodEnd },
        },
        _sum: { quantity: true },
      }),
      this.prisma.user.count({
        where: {
          clinicId,
          ...(clinic?.tier === ClinicTier.FRONT_DESK
            ? {
                NOT: {
                  AND: [{ role: Role.DOCTOR }, { appLoginDisabled: true }],
                },
              }
            : {}),
        },
      }),
      this.prisma.usageEvent.aggregate({
        where: {
          clinicId,
          type: 'USERS',
          timestamp: { gte: periodStart, lte: periodEnd },
        },
        _max: { quantity: true },
      }),
      this.prisma.usageRecord.findFirst({
        where: {
          clinicId,
          type: UsageType.USERS,
          periodStart: { gte: periodStart, lte: periodEnd },
        },
        orderBy: { quantity: 'desc' },
        select: { quantity: true },
      }),
    ]);

    const tierKey =
      (subscription?.plan as keyof typeof TIER_LIMITS) ?? 'STARTER';
    const resolvedCurrency = this.resolveCurrency(subscription?.currency);
    const tierLimits = TIER_LIMITS[tierKey];
    const includedConsultations =
      subscription?.includedAppointments ?? tierLimits.appointments ?? 0;
    const includedUsers = subscription?.includedUsers ?? tierLimits.users ?? 1;
    const tierRates =
      TIER_OVERAGE_RATES_BY_CURRENCY[resolvedCurrency][tierKey as TierName];
    const whatsappEligibleTier =
      tierKey === 'ESSENTIAL' ||
      tierKey === 'FRONT_DESK' ||
      tierKey === 'PROFESSIONAL' ||
      tierKey === 'ENTERPRISE'
        ? tierKey
        : null;
    const whatsappPlan = whatsappEligibleTier
      ? getWhatsAppAddonPricingByCurrency(
          whatsappEligibleTier,
          resolvedCurrency,
        )
      : null;
    const includedWhatsapp = whatsappPlan?.includedQuota ?? 0;
    const consultationOverage = Math.max(
      0,
      consultations - includedConsultations,
    );
    const whatsappCurrent = whatsappMessages._sum.quantity ?? 0;
    const whatsappOverage = Math.max(0, whatsappCurrent - includedWhatsapp);
    const peakUsersInCycle = Math.max(
      activeUsers,
      maxUsersEvent._max.quantity ?? 0,
      maxUsersRecord?.quantity ?? 0,
    );
    const usersOverage = Math.max(0, peakUsersInCycle - includedUsers);
    const rates = {
      consultations: tierRates.appointmentRate,
      users: tierRates.userRate,
      whatsappMessages: whatsappPlan?.overageRate ?? 0,
    };
    const breakdown = {
      consultations: {
        quantity: consultationOverage,
        rate: rates.consultations,
        charge: consultationOverage * rates.consultations,
      },
      users: {
        quantity: usersOverage,
        rate: rates.users,
        charge: usersOverage * rates.users,
      },
      whatsappMessages: {
        quantity: whatsappOverage,
        rate: rates.whatsappMessages,
        charge: whatsappOverage * rates.whatsappMessages,
      },
    };
    const total = Object.values(breakdown).reduce(
      (sum, item) => sum + item.charge,
      0,
    );
    const buildWarning = (current: number, included: number) => {
      if (included <= 0)
        return { percentUsed: 0, threshold: null as 80 | 100 | null };
      const percentUsed = (current / included) * 100;
      if (percentUsed >= 100) return { percentUsed, threshold: 100 as const };
      if (percentUsed >= 80) return { percentUsed, threshold: 80 as const };
      return { percentUsed, threshold: null as 80 | 100 | null };
    };
    const meters = {
      consultations: {
        current: consultations,
        included: includedConsultations,
        overage: consultationOverage,
      },
      users: {
        current: peakUsersInCycle,
        included: includedUsers,
        overage: usersOverage,
      },
      whatsappMessages: {
        current: whatsappCurrent,
        included: includedWhatsapp,
        overage: whatsappOverage,
      },
    };

    return {
      period: {
        start: periodStart,
        end: periodEnd,
      },
      usage: {
        consultations,
        users: peakUsersInCycle,
        whatsappMessages: whatsappCurrent,
      },
      included: {
        consultations: includedConsultations,
        users: includedUsers,
        whatsappMessages: includedWhatsapp,
      },
      overages: {
        consultations: consultationOverage,
        users: usersOverage,
        whatsappMessages: whatsappOverage,
      },
      rates,
      breakdown,
      total,
      meters,
      warnings: {
        consultations: buildWarning(consultations, includedConsultations),
        users: buildWarning(peakUsersInCycle, includedUsers),
        whatsappMessages: buildWarning(whatsappCurrent, includedWhatsapp),
      },
      tier: (subscription?.plan as ClinicTier) || ClinicTier.STARTER,
    };
  }

  async calculateOverageCharges(clinicId: string) {
    const usage = await this.getCurrentUsage(clinicId);
    const subscription = await this.prisma.subscription.findUnique({
      where: { clinicId },
      select: { currency: true },
    });

    return {
      period: usage.period,
      totalOverageCharges: usage.total,
      breakdown: usage.breakdown,
      currency: this.resolveCurrency(subscription?.currency),
    };
  }
}
