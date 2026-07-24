import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { Prisma, ReferralPayoutStatus } from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';
import { toPrismaInputJsonValue } from '@/shared/common/json/to-prisma-input-json-value';
import {
  defaultRateBandsForType,
  rateBandsSchema,
} from '@/domains/subscriptions/core/services/referral-reward.rules';

export const createReferrerSchema = z.object({
  type: z.enum(['CLINIC', 'PHARMACY', 'MARKETING_PERSON', 'CUSTOM']),
  rewardKind: z.enum(['CREDIT_MONTHS', 'REVENUE_SHARE']).optional(),
  name: z.string().min(1).max(200),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(40).optional(),
  clinicId: z.string().max(64).optional(),
  rateBands: rateBandsSchema.optional(),
  payoutDetails: z.record(z.string(), z.unknown()).optional(),
  firstYearOnly: z.boolean().optional(),
});
type CreateReferrerInput = z.infer<typeof createReferrerSchema>;

/**
 * Internal (Docita operator) administration of referral partners and the
 * revenue-share payout ledger. All routes are INTERNAL-guarded at the
 * controller. Payouts are disbursed manually — `markPayoutPaid` only records
 * that the operator has paid a ledger row.
 */
@Injectable()
export class InternalReferralService {
  constructor(private readonly prisma: PrismaService) {}

  async createReferrer(input: CreateReferrerInput) {
    const { type } = input;
    const rewardKind =
      input.rewardKind ??
      (type === 'CLINIC' ? 'CREDIT_MONTHS' : 'REVENUE_SHARE');

    const bands =
      input.rateBands ??
      (rewardKind === 'REVENUE_SHARE'
        ? [...defaultRateBandsForType(type)]
        : undefined);

    return this.prisma.referrer.create({
      data: {
        type: input.type,
        rewardKind,
        name: input.name,
        email: input.email ?? null,
        phone: input.phone ?? null,
        clinicId: input.clinicId ?? null,
        rateBands: bands ? toPrismaInputJsonValue(bands) : Prisma.JsonNull,
        payoutDetails: input.payoutDetails
          ? toPrismaInputJsonValue(input.payoutDetails)
          : Prisma.JsonNull,
        firstYearOnly: input.firstYearOnly ?? true,
      },
    });
  }

  async listReferrers() {
    return this.prisma.referrer.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async listPayouts(filter?: {
    status?: ReferralPayoutStatus;
    referrerId?: string;
  }) {
    return this.prisma.referralPayout.findMany({
      where: {
        status: filter?.status,
        referrerId: filter?.referrerId,
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async markPayoutPaid(payoutId: string) {
    // Only an unpaid, non-void row can be marked paid.
    const updated = await this.prisma.referralPayout.updateMany({
      where: {
        id: payoutId,
        status: {
          in: [ReferralPayoutStatus.PENDING, ReferralPayoutStatus.APPROVED],
        },
      },
      data: { status: ReferralPayoutStatus.PAID, paidAt: new Date() },
    });
    if (updated.count === 0) {
      throw new NotFoundException('Payout not found or not in a payable state');
    }
    return this.prisma.referralPayout.findUnique({ where: { id: payoutId } });
  }

  /** Totals by status for the operator payout dashboard. */
  async payoutSummary() {
    const grouped = await this.prisma.referralPayout.groupBy({
      by: ['status'],
      _sum: { amountCents: true },
      _count: { _all: true },
    });
    return grouped.map((row) => ({
      status: row.status,
      count: row._count._all,
      totalCents: row._sum.amountCents ?? 0,
    }));
  }
}
