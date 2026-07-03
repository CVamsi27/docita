import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  SUBSCRIPTION_PERSISTENCE_PORT,
  type SubscriptionPersistencePort,
} from '@/domains/subscriptions/application/ports/subscription-persistence.port';
import {
  OVERAGE_CALCULATION_TOKEN,
  type IOverageCalculation,
} from '@/domains/billing/application/ports';
import { ClinicTier } from '@workspace/db';
import { OverageInvoiceComposer } from '@/domains/subscriptions/infrastructure/schedulers/overage-invoice.composer';
import { mapOverageKeyToUsageType } from '@/domains/subscriptions/infrastructure/schedulers/usage-key.mapper';
import { SubscriptionOveragePaymentService } from '@/domains/subscriptions/application/services/subscription-overage-payment.service';
import {
  resolveEnterpriseContract,
  resolveIncludedQuotas,
  gatherUsageCounts,
  buildUsageData,
} from './subscription-overage-meter.helpers';

function meteredUsageEntry(
  usage: {
    consultations: { current: number; included: number; overage: number };
    users: { current: number; included: number; overage: number };
    whatsappMessages: { current: number; included: number; overage: number };
  },
  key: string,
) {
  if (key === 'consultations') return usage.consultations;
  if (key === 'users') return usage.users;
  if (key === 'whatsappMessages') return usage.whatsappMessages;
  return undefined;
}

type ActiveSubscriptionOverageRow = {
  id: string;
  clinicId: string;
  plan: ClinicTier;
  currency: string;
  includedAppointments: number | null;
  includedUsers: number | null;
};

@Injectable()
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

    const activeContract = await resolveEnterpriseContract(
      this.persistence,
      sub.clinicId,
      tier,
    );

    const currency = this.invoiceComposer.resolveCurrency(
      activeContract?.currency ?? sub.currency,
    );

    const { includedConsultations, includedUsers, whatsappIncluded } =
      resolveIncludedQuotas({ activeContract, sub, tier, currency });

    const { consultationCount, userCount, whatsappCount } =
      await gatherUsageCounts({
        persistence: this.persistence,
        clinicId: sub.clinicId,
        tier,
        periodStart,
        periodEnd,
      });

    const whatsappUsed = whatsappCount._sum.quantity ?? 0;

    const usageData = buildUsageData({
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
    });

    const result = await this.overageCalculation.calculateOverageCharges(
      sub.clinicId,
      usageData,
    );

    const overageEntries = Object.entries(result.breakdown).flatMap(
      ([key, breakdown]) => {
        const usageType = mapOverageKeyToUsageType(key);
        if (usageType === null || breakdown.charge <= 0) return [];
        return [{ key, breakdown, usageType }];
      },
    );

    const upsertResults = await Promise.allSettled(
      overageEntries.map(async ({ key, breakdown, usageType }) => {
        const usageEntry = meteredUsageEntry(usageData.usage, key);

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
            overageChargeCents: breakdown.chargeCents,
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
            overageChargeCents: breakdown.chargeCents,
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
