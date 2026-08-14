import { Inject, Injectable } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { UsageType } from '@workspace/db';
import {
  TIER_LIMITS,
  TIER_OVERAGE_RATES_BY_CURRENCY,
  getAiCreditAllotment,
  type SupportedCurrency,
} from '@workspace/types';
import {
  buildUsageWarning,
  resolveClinicTierPlan,
  resolveSupportedCurrency,
  resolveTierName,
} from '@/domains/billing/core/services/usage-tracking-tier.util';
import { getWhatsappBillableConfig } from '@/domains/billing/core/services/pricing-helpers';
import {
  type IUsageRepository,
  type SubscriptionUsageSnapshot,
  USAGE_REPOSITORY_TOKEN,
} from '@/domains/billing/core/repositories/usage.repository';

@Injectable()
export class UsageTrackingQueryService {
  constructor(
    @Inject(USAGE_REPOSITORY_TOKEN)
    private readonly usageRepository: IUsageRepository,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  resolveCurrency(currency?: string): SupportedCurrency {
    return resolveSupportedCurrency(currency);
  }

  async getCurrentUsage(clinicId: string) {
    const { periodStart, periodEnd } = this.resolveBillingPeriod(
      this.clock.now(),
    );

    const [subscription, clinic] = await Promise.all([
      this.usageRepository.findSubscriptionSnapshot(clinicId),
      this.usageRepository.findClinicTier(clinicId),
    ]);

    const counts = await this.fetchUsageCounts(
      clinicId,
      periodStart,
      periodEnd,
      clinic?.tier,
      clinic?.planMode,
    );
    return this.buildUsageSummary(periodStart, periodEnd, subscription, counts);
  }

  private resolveBillingPeriod(now: Date) {
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
    );
    return { periodStart, periodEnd };
  }

  private async fetchUsageCounts(
    clinicId: string,
    periodStart: Date,
    periodEnd: Date,
    clinicTier: string | undefined,
    planMode: string | null | undefined,
  ) {
    const [
      consultations,
      whatsappMessages,
      aiCredits,
      activeUsers,
      maxUsersEvent,
      maxUsersRecord,
    ] = await Promise.all([
      this.usageRepository.countCompletedAppointments(
        clinicId,
        periodStart,
        periodEnd,
      ),
      this.usageRepository.sumUsage(
        clinicId,
        UsageType.WHATSAPP_MESSAGES,
        periodStart,
        periodEnd,
      ),
      this.usageRepository.sumUsage(
        clinicId,
        'AI_CREDITS',
        periodStart,
        periodEnd,
      ),
      this.usageRepository.countActiveUsers(clinicId, planMode),
      this.usageRepository.maxUsage(clinicId, 'USERS', periodStart, periodEnd),
      this.usageRepository.findMaxUsageRecord(
        clinicId,
        UsageType.USERS,
        periodStart,
        periodEnd,
      ),
    ]);

    return {
      consultations,
      whatsappMessages,
      aiCredits,
      activeUsers,
      maxUsersEvent,
      maxUsersRecord,
    };
  }

  private buildUsageSummary(
    periodStart: Date,
    periodEnd: Date,
    subscription: SubscriptionUsageSnapshot | null,
    counts: {
      consultations: number;
      whatsappMessages: number;
      aiCredits: number;
      activeUsers: number;
      maxUsersEvent: number | null;
      maxUsersRecord: number | null;
    },
  ) {
    const tierKey = resolveTierName(subscription?.plan ?? undefined);
    const resolvedCurrency = this.resolveCurrency(
      subscription?.currency ?? undefined,
    );
    const tierLimits = TIER_LIMITS[tierKey];
    const includedConsultations =
      subscription?.includedAppointments ?? tierLimits.appointments ?? 0;
    const includedUsers = subscription?.includedUsers ?? tierLimits.users ?? 1;
    const tierRates = TIER_OVERAGE_RATES_BY_CURRENCY[resolvedCurrency][tierKey];
    const whatsappConfig = getWhatsappBillableConfig(tierKey, resolvedCurrency);
    const includedWhatsapp = whatsappConfig.includedQuota;
    const aiCreditAllotment = getAiCreditAllotment(tierKey);
    const includedAiCredits = aiCreditAllotment ?? 0;
    const aiCreditRate = 0;
    const consultationOverage = Math.max(
      0,
      counts.consultations - includedConsultations,
    );
    const whatsappCurrent = counts.whatsappMessages;
    const whatsappOverage = Math.max(0, whatsappCurrent - includedWhatsapp);
    const aiCreditsCurrent = counts.aiCredits;
    const aiCreditsOverage =
      aiCreditAllotment === null
        ? 0
        : Math.max(0, aiCreditsCurrent - includedAiCredits);
    const peakUsersInCycle = Math.max(
      counts.activeUsers,
      counts.maxUsersEvent ?? 0,
      counts.maxUsersRecord ?? 0,
    );
    const usersOverage = Math.max(0, peakUsersInCycle - includedUsers);
    const rates = {
      consultations: tierRates.appointmentRate,
      users: tierRates.userRate,
      whatsappMessages: whatsappConfig?.overageRate ?? 0,
      aiCredits: aiCreditRate,
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
      aiCredits: {
        quantity: aiCreditsOverage,
        rate: rates.aiCredits,
        charge: aiCreditsOverage * rates.aiCredits,
      },
    };
    const total = Object.values(breakdown).reduce(
      (sum, item) => sum + item.charge,
      0,
    );
    const meters = {
      consultations: {
        current: counts.consultations,
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
      aiCredits: {
        current: aiCreditsCurrent,
        included: includedAiCredits,
        overage: aiCreditsOverage,
      },
    };

    return {
      period: { start: periodStart, end: periodEnd },
      usage: {
        consultations: counts.consultations,
        users: peakUsersInCycle,
        whatsappMessages: whatsappCurrent,
        aiCredits: aiCreditsCurrent,
      },
      included: {
        consultations: includedConsultations,
        users: includedUsers,
        whatsappMessages: includedWhatsapp,
        aiCredits: includedAiCredits,
      },
      overages: {
        consultations: consultationOverage,
        users: usersOverage,
        whatsappMessages: whatsappOverage,
        aiCredits: aiCreditsOverage,
      },
      rates,
      breakdown,
      total,
      meters,
      warnings: {
        consultations: buildUsageWarning(
          counts.consultations,
          includedConsultations,
        ),
        users: buildUsageWarning(peakUsersInCycle, includedUsers),
        whatsappMessages: buildUsageWarning(whatsappCurrent, includedWhatsapp),
        aiCredits:
          aiCreditAllotment === null
            ? { percentUsed: 0, threshold: null }
            : buildUsageWarning(aiCreditsCurrent, includedAiCredits),
      },
      tier: resolveClinicTierPlan(subscription?.plan ?? undefined),
    };
  }

  async calculateOverageCharges(clinicId: string) {
    const usage = await this.getCurrentUsage(clinicId);
    const subscription =
      await this.usageRepository.findSubscriptionSnapshot(clinicId);

    return {
      period: usage.period,
      totalOverageCharges: usage.total,
      breakdown: usage.breakdown,
      currency: this.resolveCurrency(subscription?.currency),
    };
  }
}
