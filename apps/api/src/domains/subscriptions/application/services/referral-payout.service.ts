import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  computeRevenueShareCents,
  monthIndexForPeriod,
  resolveRateForMonth,
  type RateBand,
} from '@/domains/subscriptions/core/services/referral-reward.rules';

interface AccruePayoutInput {
  referralId: string;
  referrerId: string;
  /** Referred clinic's paid activation — anchors the first-year window. */
  activationAt: Date;
  periodStart: Date;
  periodEnd: Date;
  /** Actually-paid subscription revenue for this period, in paise. */
  paidRevenueCents: number;
  rateBands: readonly RateBand[];
  firstYearOnly?: boolean;
}

interface AccruePayoutResult {
  created: boolean;
  amountCents: number;
}

/**
 * Accrues a single revenue-share payout row for one referred clinic + billing
 * period. Pure decision via referral-reward.rules; persistence is idempotent on
 * `(referralId, periodStart)` so scheduler re-runs never double-pay, and an
 * already-recorded period is never overwritten (protects APPROVED/PAID rows).
 */
@Injectable()
export class ReferralPayoutService {
  private readonly logger = new Logger(ReferralPayoutService.name);

  constructor(private readonly prisma: PrismaService) {}

  async accruePayoutForPeriod(
    input: AccruePayoutInput,
  ): Promise<AccruePayoutResult> {
    const monthIndex = monthIndexForPeriod(
      input.activationAt,
      input.periodStart,
    );
    const amountCents = computeRevenueShareCents({
      paidRevenueCents: input.paidRevenueCents,
      monthIndex,
      bands: input.rateBands,
      firstYearOnly: input.firstYearOnly ?? true,
    });

    // Nothing owed (outside first year, no band, or zero revenue) → no row.
    if (amountCents <= 0) {
      return { created: false, amountCents: 0 };
    }

    const ratePercent = resolveRateForMonth(input.rateBands, monthIndex);

    // Idempotent: create only when this (referral, period) has no row yet.
    // Empty `update` makes a conflict a no-op, preserving any existing status.
    const existing = await this.prisma.referralPayout.findUnique({
      where: {
        referralId_periodStart: {
          referralId: input.referralId,
          periodStart: input.periodStart,
        },
      },
      select: { id: true },
    });
    if (existing) {
      return { created: false, amountCents };
    }

    await this.prisma.referralPayout.create({
      data: {
        referralId: input.referralId,
        referrerId: input.referrerId,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        baseRevenueCents: input.paidRevenueCents,
        ratePercent,
        amountCents,
      },
    });
    this.logger.log(
      `Accrued referral payout ${amountCents} paise for referral ${input.referralId} (month ${monthIndex})`,
    );
    return { created: true, amountCents };
  }
}
