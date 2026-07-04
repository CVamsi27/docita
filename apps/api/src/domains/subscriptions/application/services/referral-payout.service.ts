import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  REFERRAL_PAYOUT_REPOSITORY_TOKEN,
  type IReferralPayoutRepository,
} from '@/domains/subscriptions/application/ports/referral-payout.repository.port';
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

  constructor(
    @Inject(REFERRAL_PAYOUT_REPOSITORY_TOKEN)
    private readonly repository: IReferralPayoutRepository,
  ) {}

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

    // Idempotent: create only when this (referral, period) has no row yet, so a
    // scheduler re-run never double-pays and existing APPROVED/PAID rows stand.
    const existing = await this.repository.findExistingPayout(
      input.referralId,
      input.periodStart,
    );
    if (existing) {
      return { created: false, amountCents };
    }

    await this.repository.createPayout({
      referralId: input.referralId,
      referrerId: input.referrerId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      baseRevenueCents: input.paidRevenueCents,
      ratePercent,
      amountCents,
    });
    this.logger.log(
      `Accrued referral payout ${amountCents} paise for referral ${input.referralId} (month ${monthIndex})`,
    );
    return { created: true, amountCents };
  }
}
