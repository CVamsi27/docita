import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { GLOBAL_BULK_READ_LIMIT } from '@/shared/common/constants/bulk-read-limit.constant';
import type {
  CreateReferralPayoutInput,
  DueRevenueShareReferral,
  IReferralPayoutRepository,
  PaidPeriod,
} from '@/domains/subscriptions/application/ports/referral-payout.repository.port';

@Injectable()
export class PrismaReferralPayoutRepository implements IReferralPayoutRepository {
  constructor(private readonly prisma: PrismaService) {}

  findExistingPayout(
    referralId: string,
    periodStart: Date,
  ): Promise<{ id: string } | null> {
    return this.prisma.referralPayout.findUnique({
      where: { referralId_periodStart: { referralId, periodStart } },
      select: { id: true },
    });
  }

  async createPayout(input: CreateReferralPayoutInput): Promise<void> {
    await this.prisma.referralPayout.create({ data: input });
  }

  findDueRevenueShareReferrals(): Promise<DueRevenueShareReferral[]> {
    return this.prisma.referral.findMany({
      where: {
        status: 'CONVERTED',
        activationAt: { not: null },
        referredClinicId: { not: null },
        referrer: { is: { rewardKind: 'REVENUE_SHARE', active: true } },
      },
      select: {
        id: true,
        activationAt: true,
        referredClinicId: true,
        referrer: {
          select: {
            id: true,
            type: true,
            rewardKind: true,
            active: true,
            firstYearOnly: true,
            rateBands: true,
          },
        },
      },
      // Capped: revenue-share accrual iterates every CONVERTED referral
      // across all clinics. Dropping a row here means a clinic's referrer
      // is silently underpaid; the cap is a guardrail and the surrounding
      // accrual log surfaces anything truncated.
      take: GLOBAL_BULK_READ_LIMIT,
    });
  }

  findPaidPeriodsInWindow(
    clinicId: string,
    from: Date,
    toExclusive: Date,
  ): Promise<PaidPeriod[]> {
    return this.prisma.subscriptionPayment.findMany({
      where: {
        clinicId,
        status: 'paid',
        paidAt: { gte: from, lt: toExclusive },
      },
      select: { paidAt: true, amountCents: true },
    });
  }
}
