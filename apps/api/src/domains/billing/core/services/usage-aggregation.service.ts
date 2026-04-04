import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UsageType } from '@workspace/db';

@Injectable()
export class UsageAggregationService {
  private readonly logger = new Logger(UsageAggregationService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async aggregateDailyUsage() {
    this.logger.log('Starting daily usage aggregation...');

    await this.prisma.runUnrestricted(async () => {
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
        const addOnData = addOn.addOn;
        const quotas =
          typeof addOnData.includedQuotaByTier === 'string'
            ? JSON.parse(addOnData.includedQuotaByTier)
            : (addOnData.includedQuotaByTier as Record<string, number>);
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
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    return { yesterday, endOfYesterday };
  }
}
