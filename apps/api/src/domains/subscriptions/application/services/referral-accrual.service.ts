import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  REFERRAL_PAYOUT_REPOSITORY_TOKEN,
  type IReferralPayoutRepository,
} from '@/domains/subscriptions/application/ports/referral-payout.repository.port';
import {
  defaultRateBandsForType,
  parseRateBands,
  REFERRAL_FIRST_YEAR_MONTHS,
} from '@/domains/subscriptions/core/services/referral-reward.rules';
import { ReferralPayoutService } from './referral-payout.service';

function addMonthsUtc(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

interface AccrualRunResult {
  referralsProcessed: number;
  payoutsCreated: number;
}

/**
 * Orchestrates revenue-share accrual: for every converted referral tied to an
 * active revenue-share partner, iterate the referred clinic's paid subscription
 * payments inside the first-year window and accrue one idempotent payout per
 * paid period. Safe to run repeatedly (the payout upsert dedupes).
 */
@Injectable()
export class ReferralAccrualService {
  private readonly logger = new Logger(ReferralAccrualService.name);

  constructor(
    @Inject(REFERRAL_PAYOUT_REPOSITORY_TOKEN)
    private readonly repository: IReferralPayoutRepository,
    private readonly payoutService: ReferralPayoutService,
  ) {}

  async accrueAllDuePayouts(): Promise<AccrualRunResult> {
    const referrals = await this.repository.findDueRevenueShareReferrals();

    let payoutsCreated = 0;

    for (const referral of referrals) {
      const referrer = referral.referrer;
      if (!referrer || !referral.activationAt || !referral.referredClinicId) {
        continue;
      }

      const bands = parseRateBands(
        referrer.rateBands,
        defaultRateBandsForType(referrer.type),
      );
      if (bands.length === 0) continue;

      const windowEnd = addMonthsUtc(
        referral.activationAt,
        REFERRAL_FIRST_YEAR_MONTHS,
      );

      const payments = await this.repository.findPaidPeriodsInWindow(
        referral.referredClinicId,
        referral.activationAt,
        windowEnd,
      );

      for (const payment of payments) {
        if (!payment.paidAt) continue;
        const result = await this.payoutService.accruePayoutForPeriod({
          referralId: referral.id,
          referrerId: referrer.id,
          activationAt: referral.activationAt,
          periodStart: payment.paidAt,
          periodEnd: payment.paidAt,
          paidRevenueCents: payment.amountCents,
          rateBands: bands,
          firstYearOnly: referrer.firstYearOnly,
        });
        if (result.created) payoutsCreated += 1;
      }
    }

    if (payoutsCreated > 0) {
      this.logger.log(
        `Referral accrual: created ${payoutsCreated} payout(s) across ${referrals.length} referral(s)`,
      );
    }
    return { referralsProcessed: referrals.length, payoutsCreated };
  }
}
