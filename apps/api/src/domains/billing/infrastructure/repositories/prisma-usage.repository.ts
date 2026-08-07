import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma, UsageType } from '@workspace/db';
import { isRecord } from '@workspace/utils';
import { GLOBAL_BULK_READ_LIMIT } from '@/shared/common/constants/bulk-read-limit.constant';
import {
  type ActiveAddOnSnapshot,
  type CreateUsageEventParams,
  type IUsageRepository,
  type UpsertUsageRecordParams,
} from '@/domains/billing/core/repositories/usage.repository';

@Injectable()
export class PrismaUsageRepository implements IUsageRepository {
  constructor(private readonly prisma: PrismaService) {}

  runUnrestricted<T>(fn: () => Promise<T>): Promise<T> {
    return this.prisma.runUnrestricted(fn);
  }

  async findActiveSubscriptionClinicIds(): Promise<string[]> {
    const clinics = await this.prisma.clinic.findMany({
      where: {
        subscription: {
          status: { in: ['ACTIVE', 'TRIALING'] },
        },
      },
      select: { id: true },
      take: GLOBAL_BULK_READ_LIMIT,
    });
    return clinics.map((clinic) => clinic.id);
  }

  async findSubscriptionPlan(clinicId: string): Promise<string | null> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { clinicId },
      select: { plan: true },
    });
    return subscription?.plan ?? null;
  }

  async findSubscriptionSnapshot(clinicId: string) {
    return this.prisma.subscription.findUnique({
      where: { clinicId },
      select: {
        plan: true,
        includedAppointments: true,
        includedUsers: true,
        currency: true,
      },
    });
  }

  async findClinicTier(clinicId: string) {
    return this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { tier: true, planMode: true },
    });
  }

  async findActiveAddOns(clinicId: string): Promise<ActiveAddOnSnapshot[]> {
    const addOns = await this.prisma.clinicAddOn.findMany({
      where: { clinicId, status: 'ACTIVE' },
      include: { addOn: true },
    });
    return addOns.map((addOn) => ({
      addOnType: addOn.addOnType,
      addOn: { includedQuotaByTier: addOn.addOn.includedQuotaByTier },
    }));
  }

  async sumUsage(
    clinicId: string,
    type: UsageType,
    start: Date,
    end: Date,
  ): Promise<number> {
    const aggregation = await this.prisma.usageEvent.aggregate({
      where: {
        clinicId,
        type,
        timestamp: { gte: start, lte: end },
      },
      _sum: { quantity: true },
    });
    return aggregation._sum.quantity || 0;
  }

  async maxUsage(
    clinicId: string,
    type: UsageType,
    start: Date,
    end: Date,
  ): Promise<number | null> {
    const aggregation = await this.prisma.usageEvent.aggregate({
      where: {
        clinicId,
        type,
        timestamp: { gte: start, lte: end },
      },
      _max: { quantity: true },
    });
    return aggregation._max.quantity;
  }

  async findMaxUsageRecord(
    clinicId: string,
    type: UsageType,
    start: Date,
    end: Date,
  ): Promise<number | null> {
    const record = await this.prisma.usageRecord.findFirst({
      where: {
        clinicId,
        type,
        periodStart: { gte: start, lte: end },
      },
      orderBy: { quantity: 'desc' },
      select: { quantity: true },
    });
    return record?.quantity ?? null;
  }

  async countCompletedAppointments(
    clinicId: string,
    start: Date,
    end: Date,
  ): Promise<number> {
    return this.prisma.appointment.count({
      where: {
        clinicId,
        status: 'COMPLETED',
        updatedAt: { gte: start, lte: end },
      },
    });
  }

  async countActiveUsers(
    clinicId: string,
    planMode: string | null | undefined,
  ): Promise<number> {
    return this.prisma.user.count({
      where: {
        clinicId,
        ...(planMode === 'FRONT_DESK'
          ? {
              NOT: {
                AND: [{ role: 'DOCTOR' }, { appLoginDisabled: true }],
              },
            }
          : {}),
      },
    });
  }

  async upsertUsageRecord(params: UpsertUsageRecordParams): Promise<void> {
    const {
      clinicId,
      type,
      periodStart,
      periodEnd,
      quantity,
      includedQuota,
      overageUnits,
    } = params;
    await this.prisma.usageRecord.upsert({
      where: {
        clinicId_type_periodStart: {
          clinicId,
          type,
          periodStart,
        },
      },
      update: {
        quantity: { increment: quantity },
      },
      create: {
        clinicId,
        type,
        periodStart,
        periodEnd,
        quantity,
        includedQuota,
        overageUnits,
      },
    });
  }

  async createUsageEvent(params: CreateUsageEventParams): Promise<boolean> {
    const {
      clinicId,
      type,
      quantity,
      entityType,
      entityId,
      eventKey,
      metadata,
    } = params;
    try {
      await this.prisma.usageEvent.create({
        data: {
          clinicId,
          type,
          quantity,
          entityType,
          entityId,
          eventKey,
          metadata: metadata ?? Prisma.JsonNull,
        },
      });
      return true;
    } catch (error) {
      if (isRecord(error) && error['code'] === 'P2002') {
        return false;
      }
      throw error;
    }
  }
}
