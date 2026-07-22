import { Inject, Injectable, Logger } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { addOnIncludedQuotaByTierJsonSchema } from '@workspace/types';
import { PrismaService } from '@/prisma/prisma.service';
import { UsageType } from '@workspace/db';
import { parsePrismaJsonColumn } from '@/shared/common/json/parse-prisma-json-column';
import { GLOBAL_BULK_READ_LIMIT } from '@/shared/common/constants/bulk-read-limit.constant';

@Injectable()
export class UsageAggregationService {
  private readonly logger = new Logger(UsageAggregationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async runDailyUsageAggregation(): Promise<void> {
    this.logger.log('Starting daily usage aggregation...');

    // RLS-BYPASS: usage aggregation rolls up metrics across clinics
    await this.prisma.runUnrestricted(async () => {
      const { yesterday, endOfYesterday } = this.getYesterdayRange();

      const clinics = await this.prisma.clinic.findMany({
        where: {
          subscription: {
            status: { in: ['ACTIVE', 'TRIALING'] },
          },
        },
        select: { id: true },
        // Capped: daily cron iterates every active/trialing clinic to roll
        // up usage metrics. The cap is a guardrail well above current
        // scale; if it fires the per-clinic failure loop surfaces it
        // loudly in the daily log.
        take: GLOBAL_BULK_READ_LIMIT,
      });

      const results = await Promise.allSettled(
        clinics.map((clinic) =>
          this.aggregateForClinic(clinic.id, yesterday, endOfYesterday),
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
        const clinic = clinics[index];
        this.logger.error(
          `Failed to aggregate usage for clinic ${clinic?.id ?? 'unknown'}:`,
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
    const [subscription, addOns] = await Promise.all([
      this.prisma.subscription.findUnique({
        where: { clinicId },
        select: { plan: true },
      }),
      this.prisma.clinicAddOn.findMany({
        where: { clinicId, status: 'ACTIVE' },
        include: { addOn: true },
      }),
    ]);

    const plan =
      typeof subscription?.plan === 'string' ? subscription.plan : 'CORE';

    const aggregationResults = await Promise.allSettled([
      this.aggregateUsageType(
        clinicId,
        'WHATSAPP_MESSAGES',
        periodStart,
        periodEnd,
        plan,
        addOns.find((a) => a.addOnType === 'WHATSAPP'),
      ),
      this.aggregateUsageType(
        clinicId,
        'AI_CREDITS',
        periodStart,
        periodEnd,
        plan,
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
    addOn?: { addOn: Record<string, unknown> },
  ) {
    const aggregation = await this.prisma.usageEvent.aggregate({
      where: {
        clinicId,
        type,
        timestamp: { gte: start, lte: end },
      },
      _sum: { quantity: true },
    });

    const quantity = aggregation._sum.quantity || 0;
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

    await this.prisma.usageRecord.upsert({
      where: {
        clinicId_type_periodStart: {
          clinicId,
          type,
          periodStart: monthStart,
        },
      },
      update: {
        quantity: { increment: quantity },
      },
      create: {
        clinicId,
        type,
        periodStart: monthStart,
        periodEnd: monthEnd,
        quantity,
        includedQuota: included,
        overageUnits: Math.max(0, quantity - included),
      },
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
