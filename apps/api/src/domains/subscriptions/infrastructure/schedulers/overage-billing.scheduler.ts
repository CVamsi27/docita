import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';
import { OverageCalculationService } from '@/domains/billing/core/services/overage-calculation.service';
import { TIER_LIMITS } from '@workspace/types';
import { ClinicTier, UsageType } from '@workspace/db';

@Injectable()
export class OverageBillingScheduler {
  private readonly logger = new Logger(OverageBillingScheduler.name);
  private databaseAccessDisabled = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly overageCalculationService: OverageCalculationService,
  ) {}

  private isDatabaseAuthError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const candidate = error as { code?: unknown; message?: unknown };
    const code = typeof candidate.code === 'string' ? candidate.code : '';
    const message =
      typeof candidate.message === 'string'
        ? candidate.message.toLowerCase()
        : '';
    return (
      code === 'P1000' ||
      message.includes('authentication failed against the database server') ||
      message.includes('password authentication failed')
    );
  }

  // Run at 2 AM on the 1st of every month to bill prior month overages
  @Cron('0 2 1 * *')
  async billMonthlyOverages(): Promise<void> {
    if (this.databaseAccessDisabled) return;

    const now = new Date();
    // Prior month date range
    const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const periodEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
    );

    this.logger.log(
      `Running monthly overage billing for ${periodStart.toISOString().slice(0, 7)}`,
    );

    try {
      await this.prisma.runUnrestricted(async () => {
        const activeSubscriptions = await this.prisma.subscription.findMany({
          where: { status: { in: ['ACTIVE', 'TRIALING'] } },
          select: {
            id: true,
            clinicId: true,
            plan: true,
            includedPatients: true,
            includedAppointments: true,
            includedUsers: true,
          },
        });

        this.logger.log(
          `Processing overage for ${activeSubscriptions.length} active subscriptions`,
        );

        for (const sub of activeSubscriptions) {
          try {
            await this.processSubscriptionOverage(sub, periodStart, periodEnd);
          } catch (err) {
            this.logger.error(
              `Overage billing failed for clinic ${sub.clinicId}`,
              err,
            );
          }
        }
      });
    } catch (error) {
      if (this.isDatabaseAuthError(error)) {
        this.databaseAccessDisabled = true;
        this.logger.warn(
          'Disabling overage scheduler due to database authentication failure.',
        );
        return;
      }
      this.logger.error('Monthly overage billing cron failed', error);
    }
  }

  private async processSubscriptionOverage(
    sub: {
      id: string;
      clinicId: string;
      plan: ClinicTier;
      includedPatients: number;
      includedAppointments: number | null;
      includedUsers: number | null;
    },
    periodStart: Date,
    periodEnd: Date,
  ): Promise<void> {
    const tier = sub.plan;
    const tierKey = tier as keyof typeof TIER_LIMITS;
    const tierLimits = TIER_LIMITS[tierKey];

    const includedPatients = sub.includedPatients || tierLimits.patients;
    const includedAppointments =
      sub.includedAppointments ?? tierLimits.appointments ?? 0;
    const includedUsers = sub.includedUsers ?? tierLimits.users ?? 0;

    // Count usage events for the prior month period
    const [patientCount, appointmentCount, userCount, whatsappCount] =
      await Promise.all([
        this.prisma.patient.count({
          where: {
            clinicId: sub.clinicId,
            createdAt: { gte: periodStart, lte: periodEnd },
          },
        }),
        this.prisma.appointment.count({
          where: {
            clinicId: sub.clinicId,
            startTime: { gte: periodStart, lte: periodEnd },
          },
        }),
        this.prisma.user.count({
          where: { clinicId: sub.clinicId },
        }),
        this.prisma.usageEvent.aggregate({
          where: {
            clinicId: sub.clinicId,
            type: UsageType.WHATSAPP_MESSAGES,
            createdAt: { gte: periodStart, lte: periodEnd },
          },
          _sum: { quantity: true },
        }),
      ]);

    const whatsappUsed = whatsappCount._sum.quantity ?? 0;
    const whatsappIncluded = tier === 'PROFESSIONAL' ? 2000 : 500;

    const usageData = {
      period: { start: periodStart, end: periodEnd },
      usage: {
        activePatients: {
          current: patientCount,
          included: includedPatients,
          overage: Math.max(0, patientCount - includedPatients),
        },
        appointments: {
          current: appointmentCount,
          included: includedAppointments,
          overage: Math.max(0, appointmentCount - includedAppointments),
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
        aiCredits: { current: 0, included: 0, overage: 0 },
      },
      tier,
    };

    const result = await this.overageCalculationService.calculateOverageCharges(
      sub.clinicId,
      usageData,
    );

    // Persist usage records for each dimension that had overage
    const overageEntries = Object.entries(result.breakdown).filter(
      ([key, breakdown]) =>
        this.mapKeyToUsageType(key) !== null && breakdown.charge > 0,
    );

    for (const [key, breakdown] of overageEntries) {
      const usageType = this.mapKeyToUsageType(key)!;
      const usageEntry = usageData.usage[key as keyof typeof usageData.usage];
      await this.prisma.usageRecord.create({
        data: {
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
    }

    if (overageEntries.length > 0) {
      this.logger.log(
        `Clinic ${sub.clinicId}: recorded ${overageEntries.length} overage items, ` +
          `total charge ₹${result.totalOverageCharges.toFixed(2)} for ${periodStart.toISOString().slice(0, 7)}`,
      );
    }
  }

  private mapKeyToUsageType(key: string): UsageType | null {
    const map: Record<string, UsageType> = {
      activePatients: UsageType.ACTIVE_PATIENTS,
      appointments: UsageType.APPOINTMENTS,
      users: UsageType.USERS,
      whatsappMessages: UsageType.WHATSAPP_MESSAGES,
    };
    return map[key] ?? null;
  }
}
