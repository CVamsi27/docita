import { Injectable } from '@nestjs/common';
import { Prisma } from '@workspace/db';

import { PrismaService } from '@/prisma/prisma.service';
import {
  QuotaUpsertInput,
  TenantQuota,
} from '@/shared/modules/tenant-rate-limit/tenant-rate-limit.types';

function isMissingClinicApiQuotaTable(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2021' &&
    String(error.message).includes('ClinicApiQuota')
  );
}

const monthlyResetDate = (): Date => {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0),
  );
};

@Injectable()
export class TenantRateLimitRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findQuota(clinicId: string): Promise<TenantQuota | null> {
    return this.prisma.runUnrestricted(async () => {
      try {
        const row = await this.prisma.clinicApiQuota.findUnique({
          where: { clinicId },
        });
        if (!row) return null;
        return {
          rps: row.rps,
          rpm: row.rpm,
          monthlyBudget: row.monthlyBudget,
          currentMonthUsed: row.currentMonthUsed,
          currentMonthResetsAt: row.currentMonthResetsAt,
        } satisfies TenantQuota;
      } catch (error) {
        if (isMissingClinicApiQuotaTable(error)) {
          return null;
        }
        throw error;
      }
    });
  }

  async upsertQuota(
    clinicId: string,
    input: QuotaUpsertInput,
  ): Promise<TenantQuota> {
    return this.prisma.runUnrestricted(async () => {
      const resetAt = monthlyResetDate();
      const row = await this.prisma.clinicApiQuota.upsert({
        where: { clinicId },
        update: {
          rps: input.rps,
          rpm: input.rpm,
          monthlyBudget: input.monthlyBudget,
          notes: input.notes ?? null,
        },
        create: {
          clinicId,
          rps: input.rps,
          rpm: input.rpm,
          monthlyBudget: input.monthlyBudget,
          currentMonthUsed: 0,
          currentMonthResetsAt: resetAt,
          notes: input.notes ?? null,
        },
      });
      return {
        rps: row.rps,
        rpm: row.rpm,
        monthlyBudget: row.monthlyBudget,
        currentMonthUsed: row.currentMonthUsed,
        currentMonthResetsAt: row.currentMonthResetsAt,
      };
    });
  }

  /**
   * Atomically increments the persisted monthly usage counter.
   * If the row does not exist (clinic uses defaults), this no-ops.
   * Caller should batch increments to avoid hot-row contention.
   */
  async incrementMonthlyUsage(
    clinicId: string,
    delta: number,
  ): Promise<TenantQuota | null> {
    if (delta <= 0) return null;
    return this.prisma.runUnrestricted(async () => {
      try {
        const existing = await this.prisma.clinicApiQuota.findUnique({
          where: { clinicId },
        });
        if (!existing) {
          return null;
        }
        const now = new Date();
        const needsReset =
          existing.currentMonthResetsAt.getTime() <= now.getTime();
        const updated = await this.prisma.clinicApiQuota.update({
          where: { clinicId },
          data: needsReset
            ? {
                currentMonthUsed: delta,
                currentMonthResetsAt: monthlyResetDate(),
              }
            : { currentMonthUsed: { increment: delta } },
        });
        return {
          rps: updated.rps,
          rpm: updated.rpm,
          monthlyBudget: updated.monthlyBudget,
          currentMonthUsed: updated.currentMonthUsed,
          currentMonthResetsAt: updated.currentMonthResetsAt,
        };
      } catch (error) {
        if (isMissingClinicApiQuotaTable(error)) {
          return null;
        }
        throw error;
      }
    });
  }
}
