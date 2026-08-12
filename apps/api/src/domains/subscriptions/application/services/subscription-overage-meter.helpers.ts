import { ClinicTier, EnterpriseContractStatus, UsageType } from '@workspace/db';
import {
  TIER_LIMITS,
  type SupportedCurrency,
  type TierName,
} from '@workspace/types';
import { getWhatsAppAddonPricingByCurrency } from '@workspace/utils';
import type { SubscriptionPersistencePort } from '@/domains/subscriptions/application/ports/subscription-persistence.port';
import { activeUsersWhereFilter } from '@/shared/common/user-where-fragments';

function clinicTierToTierName(tier: ClinicTier): TierName {
  switch (tier) {
    case ClinicTier.STARTER:
      return 'STARTER';
    case ClinicTier.ESSENTIAL:
      return 'ESSENTIAL';
    case ClinicTier.PROFESSIONAL:
      return 'PROFESSIONAL';
    case ClinicTier.HOSPITAL:
      return 'HOSPITAL';
    case ClinicTier.ENTERPRISE:
      return 'ENTERPRISE';
    default: {
      const _exhaustive: never = tier;
      return _exhaustive;
    }
  }
}

export async function resolveEnterpriseContract(
  persistence: SubscriptionPersistencePort,
  clinicId: string,
  tier: ClinicTier,
) {
  if (tier !== ClinicTier.ENTERPRISE) return null;

  const member = await persistence.enterpriseContractMember.findUnique({
    where: { clinicId },
  });
  const candidate = member
    ? await persistence.enterpriseContract.findUnique({
        where: { id: member.contractId },
      })
    : await persistence.enterpriseContract.findFirst({
        where: { primaryClinicId: clinicId },
      });

  if (candidate?.status === EnterpriseContractStatus.ACTIVE) {
    return candidate;
  }
  return null;
}

interface ResolveIncludedQuotasParams {
  activeContract: Awaited<ReturnType<typeof resolveEnterpriseContract>>;
  sub: { includedAppointments: number | null; includedUsers: number | null };
  tier: ClinicTier;
  currency: SupportedCurrency;
}

export function resolveIncludedQuotas({
  activeContract,
  sub,
  tier,
  currency,
}: ResolveIncludedQuotasParams) {
  const tierLimits = TIER_LIMITS[clinicTierToTierName(tier)];

  const includedConsultations =
    activeContract?.includedConsultations ??
    sub.includedAppointments ??
    tierLimits.appointments ??
    0;
  const includedUsers =
    activeContract?.includedUsers ?? sub.includedUsers ?? tierLimits.users ?? 0;

  const whatsappEligibleTier =
    tier === ClinicTier.ESSENTIAL ||
    tier === ClinicTier.PROFESSIONAL ||
    tier === ClinicTier.HOSPITAL ||
    tier === ClinicTier.ENTERPRISE
      ? tier
      : null;
  const whatsappIncluded =
    activeContract?.includedWhatsappMessages ??
    (whatsappEligibleTier
      ? getWhatsAppAddonPricingByCurrency(whatsappEligibleTier, currency)
          .includedQuota
      : 0);

  return { includedConsultations, includedUsers, whatsappIncluded };
}

interface GatherUsageCountsParams {
  persistence: SubscriptionPersistencePort;
  clinicId: string;
  tier: ClinicTier;
  planMode?: string | null;
  periodStart: Date;
  periodEnd: Date;
}

export async function gatherUsageCounts({
  persistence,
  clinicId,
  tier: _tier,
  planMode,
  periodStart,
  periodEnd,
}: GatherUsageCountsParams) {
  const [consultationCount, userCount, whatsappCount] = await Promise.all([
    persistence.appointment.count({
      where: {
        clinicId,
        status: 'COMPLETED',
        updatedAt: { gte: periodStart, lte: periodEnd },
      },
    }),
    persistence.user.count({
      where: activeUsersWhereFilter(clinicId, planMode),
    }),
    persistence.usageEvent.aggregate({
      where: {
        clinicId,
        type: UsageType.WHATSAPP_MESSAGES,
        timestamp: { gte: periodStart, lte: periodEnd },
      },
      _sum: { quantity: true },
    }),
  ]);

  return { consultationCount, userCount, whatsappCount };
}

interface BuildUsageDataParams {
  consultationCount: number;
  userCount: number;
  whatsappUsed: number;
  includedConsultations: number;
  includedUsers: number;
  whatsappIncluded: number;
  tier: ClinicTier;
  currency: SupportedCurrency;
  periodStart: Date;
  periodEnd: Date;
  activeContract: Awaited<ReturnType<typeof resolveEnterpriseContract>>;
}

export function buildUsageData({
  consultationCount,
  userCount,
  whatsappUsed,
  includedConsultations,
  includedUsers,
  whatsappIncluded,
  tier,
  currency,
  periodStart,
  periodEnd,
  activeContract,
}: BuildUsageDataParams) {
  return {
    period: { start: periodStart, end: periodEnd },
    usage: {
      consultations: {
        current: consultationCount,
        included: includedConsultations,
        overage: Math.max(0, consultationCount - includedConsultations),
      },
      users: {
        current: userCount,
        included: includedUsers,
        overage: Math.max(0, userCount - includedUsers),
      },
      whatsappMessages: {
        current: whatsappUsed,
        included: whatsappIncluded,
        overage: Math.max(0, whatsappUsed - whatsappIncluded),
      },
    },
    tier,
    currency,
    rateOverridesCents: activeContract
      ? {
          consultation: activeContract.overageConsultationCents,
          user: activeContract.overageUserCents,
          whatsapp: activeContract.overageWhatsappCents,
          storage: activeContract.overageStorageCents,
        }
      : undefined,
  };
}
