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

    // Resolve the per-referral paid-period list (one round-trip per referral
    // — the SQL is index-backed and the dataset is small because each
    // referral is bound to a single clinic). Then accrue every
    // (referral, payment) pair concurrently. accruePayoutForPeriod is
    // idempotent (dedupes on (referralId, periodStart)), so parallel
    // execution cannot double-pay and the pool absorbs the burst.
    //
    // Without this refactor, 50 referrals × 12 monthly payments = 600
    // sequential round-trips per scheduler tick; with it, the same work
    // completes in roughly the duration of a single accrual.
    type AccrualJob = {
      referralId: string;
      referrerId: string;
      activationAt: Date;
      periodStart: Date;
      periodEnd: Date;
      paidRevenueCents: number;
      rateBands: ReturnType<typeof parseRateBands>;
      firstYearOnly: boolean;
    };

    const jobs: AccrualJob[] = [];
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
        jobs.push({
          referralId: referral.id,
          referrerId: referrer.id,
          activationAt: referral.activationAt,
          periodStart: payment.paidAt,
          periodEnd: payment.paidAt,
          paidRevenueCents: payment.amountCents,
          rateBands: bands,
          firstYearOnly: referrer.firstYearOnly ?? true,
        });
      }
    }

    const results = await Promise.allSettled(
      jobs.map((job) => this.payoutService.accruePayoutForPeriod(job)),
    );

    let payoutsCreated = 0;
    const failures: PromiseRejectedResult[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        if (result.value.created) payoutsCreated += 1;
      } else {
        failures.push(result);
      }
    }
    if (failures.length > 0) {
      // Surface but do not rethrow: the scheduler cron will retry the whole
      // batch on the next tick. Logging each rejection keeps the failure
      // visible in Sentry / log search without aborting the run.
      this.logger.error(
        `Referral accrual: ${failures.length} of ${results.length} job(s) failed`,
        failures.map((f) => f.reason).join('\n'),
      );
    }

    if (payoutsCreated > 0) {
      this.logger.log(
        `Referral accrual: created ${payoutsCreated} payout(s) across ${referrals.length} referral(s)`,
      );
    }
    return { referralsProcessed: referrals.length, payoutsCreated };
  }
}
