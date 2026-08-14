import { Inject, Injectable, Logger } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { addOnIncludedQuotaByTierJsonSchema } from '@workspace/types';
import { UsageType } from '@workspace/db';
import { parsePrismaJsonColumn } from '@/shared/common/json/parse-prisma-json-column';
import {
  type ActiveAddOnSnapshot,
  type IUsageRepository,
  USAGE_REPOSITORY_TOKEN,
} from '@/domains/billing/core/repositories/usage.repository';

@Injectable()
export class UsageAggregationService {
  private readonly logger = new Logger(UsageAggregationService.name);

  constructor(
    @Inject(USAGE_REPOSITORY_TOKEN)
    private readonly usageRepository: IUsageRepository,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async runDailyUsageAggregation(): Promise<void> {
    this.logger.log('Starting daily usage aggregation...');

    // RLS-BYPASS: usage aggregation rolls up metrics across clinics
    await this.usageRepository.runUnrestricted(async () => {
      const { yesterday, endOfYesterday } = this.getYesterdayRange();

      const clinicIds =
        await this.usageRepository.findActiveSubscriptionClinicIds();

      const results = await Promise.allSettled(
        clinicIds.map((clinicId) =>
          this.aggregateForClinic(clinicId, yesterday, endOfYesterday),
        ),
      );
      let successCount = 0;
      let errorCount = 0;
      for (const [index, result] of results.entries()) {
        if (result.status === 'fulfilled') {
          successCount++;
          continue;
        }
        errorCount++;
        this.logger.error(
          `Failed to aggregate usage for clinic ${clinicIds[index] ?? 'unknown'}:`,
          result.reason,
        );
      }

      this.logger.log(
        `Daily usage aggregation complete: ${successCount} succeeded, ${errorCount} failed`,
      );
    });
  }

  private async aggregateForClinic(
    clinicId: string,
    periodStart: Date,
    periodEnd: Date,
  ) {
    const [plan, addOns] = await Promise.all([
      this.usageRepository.findSubscriptionPlan(clinicId),
      this.usageRepository.findActiveAddOns(clinicId),
    ]);

    const resolvedPlan = plan ?? 'CORE';

    const aggregationResults = await Promise.allSettled([
      this.aggregateUsageType(
        clinicId,
        'WHATSAPP_MESSAGES',
        periodStart,
        periodEnd,
        resolvedPlan,
        addOns.find((a) => a.addOnType === 'WHATSAPP'),
      ),
      this.aggregateUsageType(
        clinicId,
        'AI_CREDITS',
        periodStart,
        periodEnd,
        resolvedPlan,
        addOns.find((a) => a.addOnType === 'INTELLIGENCE'),
      ),
    ]);
    for (const result of aggregationResults) {
      if (result.status === 'rejected') {
        this.logger.error(
          `Usage aggregation partial failure for clinic ${clinicId}:`,
          result.reason,
        );
      }
    }
  }

  private async aggregateUsageType(
    clinicId: string,
    type: UsageType,
    start: Date,
    end: Date,
    plan: string,
    addOn?: ActiveAddOnSnapshot,
  ) {
    const quantity = await this.usageRepository.sumUsage(
      clinicId,
      type,
      start,
      end,
    );
    if (quantity === 0) return;

    let included = 0;
    if (addOn) {
      try {
        const quotas =
          parsePrismaJsonColumn(
            addOn.addOn.includedQuotaByTier,
            addOnIncludedQuotaByTierJsonSchema,
          ) ?? {};
        included = quotas[plan] || 0;
      } catch (error) {
        this.logger.error(`Error parsing quota for ${type}`, error);
      }
    }

    const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);
    const monthEnd = new Date(
      start.getFullYear(),
      start.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    await this.usageRepository.upsertUsageRecord({
      clinicId,
      type,
      periodStart: monthStart,
      periodEnd: monthEnd,
      quantity,
      includedQuota: included,
      overageUnits: Math.max(0, quantity - included),
    });
  }

  private getYesterdayRange() {
    const yesterday = this.clock.now();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    return { yesterday, endOfYesterday };
  }
}
