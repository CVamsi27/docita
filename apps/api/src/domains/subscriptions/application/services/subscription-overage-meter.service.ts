import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  SUBSCRIPTION_PERSISTENCE_PORT,
  type SubscriptionPersistencePort,
} from '@/domains/subscriptions/application/ports/subscription-persistence.port';
import {
  OVERAGE_CALCULATION_TOKEN,
  type IOverageCalculation,
} from '@/domains/billing/application/ports';
import { TIER_LIMITS } from '@workspace/types';
import { getWhatsAppAddonPricingByCurrency } from '@workspace/utils';
import {
  ClinicTier,
  UsageType,
  Role,
  EnterpriseContractStatus,
} from '@workspace/db';
import { OverageInvoiceComposer } from '@/domains/subscriptions/infrastructure/schedulers/overage-invoice.composer';
import { mapOverageKeyToUsageType } from '@/domains/subscriptions/infrastructure/schedulers/usage-key.mapper';
import { SubscriptionOveragePaymentService } from '@/domains/subscriptions/application/services/subscription-overage-payment.service';

export type ActiveSubscriptionOverageRow = {
  id: string;
  clinicId: string;
  plan: ClinicTier;
  currency: string;
  includedAppointments: number | null;
  includedUsers: number | null;
};

@Injectable()
/**
 * Facade for monthly overage metering; real pricing, invoice composition, and
 * payment-link work lives in the injected collaborators.
 */
export class SubscriptionOverageMeterService {
  private readonly logger = new Logger(SubscriptionOverageMeterService.name);

  constructor(
    @Inject(SUBSCRIPTION_PERSISTENCE_PORT)
    private readonly persistence: SubscriptionPersistencePort,
    @Inject(OVERAGE_CALCULATION_TOKEN)
    private readonly overageCalculation: IOverageCalculation,
    private readonly invoiceComposer: OverageInvoiceComposer,
    private readonly overagePaymentService: SubscriptionOveragePaymentService,
  ) {}

  async processSubscriptionOverage(
    sub: ActiveSubscriptionOverageRow,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<void> {
    const tier = sub.plan;

    let activeContract: Awaited<
      ReturnType<typeof this.persistence.enterpriseContract.findUnique>
    > = null;
    if (tier === ClinicTier.ENTERPRISE) {
      const member = await this.persistence.enterpriseContractMember.findUnique({
        where: { clinicId: sub.clinicId },
      });
      const candidate = member
        ? await this.persistence.enterpriseContract.findUnique({
            where: { id: member.contractId },
          })
        : await this.persistence.enterpriseContract.findFirst({
            where: { primaryClinicId: sub.clinicId },
          });
      if (candidate?.status === EnterpriseContractStatus.ACTIVE) {
        activeContract = candidate;
      }
    }

    const currency = this.invoiceComposer.resolveCurrency(
      activeContract?.currency ?? sub.currency,
    );
    const tierKey = tier as keyof typeof TIER_LIMITS;
    const tierLimits = TIER_LIMITS[tierKey];

    const includedConsultations =
      activeContract?.includedConsultations ??
      sub.includedAppointments ??
      tierLimits.appointments ??
      0;
    const includedUsers =
      activeContract?.includedUsers ??
      sub.includedUsers ??
      tierLimits.users ??
      0;

    const [consultationCount, userCount, whatsappCount] = await Promise.all([
      this.persistence.appointment.count({
        where: {
          clinicId: sub.clinicId,
          status: 'COMPLETED',
          updatedAt: { gte: periodStart, lte: periodEnd },
        },
      }),
      this.persistence.user.count({
        where: {
          clinicId: sub.clinicId,
          ...(tier === ClinicTier.FRONT_DESK
            ? {
                NOT: {
                  AND: [{ role: Role.DOCTOR }, { appLoginDisabled: true }],
                },
              }
            : {}),
        },
      }),
      this.persistence.usageEvent.aggregate({
        where: {
          clinicId: sub.clinicId,
          type: UsageType.WHATSAPP_MESSAGES,
          timestamp: { gte: periodStart, lte: periodEnd },
        },
        _sum: { quantity: true },
      }),
    ]);

    const whatsappUsed = whatsappCount._sum.quantity ?? 0;
    const whatsappEligibleTier =
      tier === ClinicTier.ESSENTIAL ||
      tier === ClinicTier.FRONT_DESK ||
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

    const usageData = {
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

    const result = await this.overageCalculation.calculateOverageCharges(
      sub.clinicId,
      usageData,
    );

    const overageEntries = Object.entries(result.breakdown).flatMap(
      ([key, breakdown]) => {
        const usageType = mapOverageKeyToUsageType(key);
        if (usageType === null || breakdown.charge <= 0) {
          return [];
        }
        return [{ key, breakdown, usageType }];
      },
    );

    const upsertResults = await Promise.allSettled(
      overageEntries.map(async ({ key, breakdown, usageType }) => {
        const usageEntry = usageData.usage[key as keyof typeof usageData.usage];

        await this.persistence.usageRecord.upsert({
          where: {
            clinicId_type_periodStart: {
              clinicId: sub.clinicId,
              type: usageType,
              periodStart,
            },
          },
          update: {
            quantity: usageEntry?.current ?? 0,
            includedQuota: usageEntry?.included ?? 0,
            overageUnits: breakdown.quantity,
            overageChargeCents: Math.round(breakdown.charge * 100),
            metadata: { subscriptionId: sub.id },
          },
          create: {
            clinicId: sub.clinicId,
            type: usageType,
            periodStart,
            periodEnd,
            quantity: usageEntry?.current ?? 0,
            includedQuota: usageEntry?.included ?? 0,
            overageUnits: breakdown.quantity,
            overageChargeCents: Math.round(breakdown.charge * 100),
            metadata: { subscriptionId: sub.id },
          },
        });
      }),
    );
    const upsertFailures = upsertResults.filter((r) => r.status === 'rejected');
    if (upsertFailures.length > 0) {
      this.logger.warn(
        `${upsertFailures.length} overage usage-record upsert(s) failed for clinic ${sub.clinicId}`,
      );
    }

    if (result.totalOverageCharges > 0) {
      await this.overagePaymentService.createOrUpdateOverageInvoicePayment({
        clinicId: sub.clinicId,
        subscriptionId: sub.id,
        periodStart,
        periodEnd,
        totalOverageCharges: result.totalOverageCharges,
        currency: result.currency,
        breakdown: result.breakdown,
      });
    }

    if (overageEntries.length > 0) {
      const currencySymbol = this.invoiceComposer.getCurrencySymbol(
        result.currency,
      );
      this.logger.log(
        `Clinic ${sub.clinicId}: recorded ${overageEntries.length} overage items, ` +
          `total charge ${currencySymbol}${result.totalOverageCharges.toFixed(2)} for ${periodStart.toISOString().slice(0, 7)}`,
      );
    }
  }
}
