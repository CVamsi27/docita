/**
 * Usage Aggregation Service (SRP)
 *
 * Single Responsibility: Daily aggregation of usage events into usage records.
 * Extracted from UsageTrackingService's @Cron job.
 *
 * Cost Optimization:
 * - Batch processing per clinic (reduces transaction count)
 * - Parallel aggregation of different usage types
 * - Upsert pattern avoids duplicate records
 *
 * Design Pattern: Template Method
 * - aggregateForClinic() defines the aggregation skeleton
 * - Each usage type follows the same aggregate → upsert pattern
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UsageType } from '@workspace/db';

@Injectable()
export class UsageAggregationService {
  private readonly logger = new Logger(UsageAggregationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Daily aggregation job - runs at midnight
   * Aggregates usage events into usage records for billing
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async aggregateDailyUsage() {
    this.logger.log('Starting daily usage aggregation...');

    const { yesterday, endOfYesterday } = this.getYesterdayRange();

    const clinics = await this.prisma.clinic.findMany({
      where: {
        subscription: {
          status: { in: ['ACTIVE', 'TRIALING'] },
        },
      },
      select: { id: true },
    });

    let successCount = 0;
    let errorCount = 0;

    for (const clinic of clinics) {
      try {
        await this.aggregateForClinic(clinic.id, yesterday, endOfYesterday);
        successCount++;
      } catch (error) {
        errorCount++;
        this.logger.error(
          `Failed to aggregate usage for clinic ${clinic.id}:`,
          error,
        );
      }
    }

    this.logger.log(
      `Daily usage aggregation complete: ${successCount} succeeded, ${errorCount} failed`,
    );
  }

  /**
   * Aggregate all usage types for a single clinic
   * Runs WhatsApp + AI aggregation in parallel (cost optimization)
   */
  private async aggregateForClinic(
    clinicId: string,
    periodStart: Date,
    periodEnd: Date,
  ) {
    // Fetch subscription + add-ons in one parallel batch
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

    const plan = subscription?.plan || 'CORE';

    // Aggregate WhatsApp + AI in parallel
    await Promise.all([
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
  }

  /**
   * Aggregate a single usage type for a clinic
   * Template Method: same pattern for all usage types
   */
  private async aggregateUsageType(
    clinicId: string,
    type: string,
    periodStart: Date,
    periodEnd: Date,
    plan: string,
    addOn?: { addOn: { includedQuotaByTier: unknown } },
  ) {
    const events = await this.prisma.usageEvent.aggregate({
      where: {
        clinicId,
        type: type as UsageType,
        timestamp: { gte: periodStart, lte: periodEnd },
      },
      _sum: { quantity: true },
    });

    const quantity = events._sum.quantity || 0;
    if (quantity <= 0) return;

    const includedQuota = this.getIncludedQuota(addOn, plan);

    await this.prisma.usageRecord.upsert({
      where: {
        clinicId_type_periodStart: {
          clinicId,
          type: type as UsageType,
          periodStart,
        },
      },
      update: {
        quantity,
        overageUnits: Math.max(0, quantity - includedQuota),
      },
      create: {
        clinicId,
        type: type as UsageType,
        periodStart,
        periodEnd,
        quantity,
        includedQuota,
        overageUnits: Math.max(0, quantity - includedQuota),
      },
    });
  }

  // ========================================================================
  // Private Helpers
  // ========================================================================

  private getYesterdayRange() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    return { yesterday, endOfYesterday };
  }

  private getIncludedQuota(
    addOn: { addOn: { includedQuotaByTier: unknown } } | undefined,
    plan: string,
  ): number {
    if (!addOn) return 0;
    try {
      return JSON.parse(addOn.addOn.includedQuotaByTier as string)[plan] || 0;
    } catch {
      return 0;
    }
  }
}
