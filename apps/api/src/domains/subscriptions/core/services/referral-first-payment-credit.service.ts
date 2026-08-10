import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  PARTNER_PERSISTENCE_PORT,
  type PartnerPersistencePort,
} from '@/domains/subscriptions/application/ports/partner-persistence.port';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { MAX_REFERRAL_CREDITS_PER_YEAR } from '@workspace/types';

/**
 * Realises the referral credit on a clinic's first successful payment:
 *   - flips the Referral row from SIGNED_UP → CONVERTED
 *   - anchors activationAt so ReferralAccrualService can pick it up
 *   - increments the referrer's `referralCreditsMonths` (capped per year)
 *   - writes the audit row in `ReferralCredit`
 *
 * Extracted from ReferralService so the parent stays under the
 * file-size budget (≤ 400 lines per check:file-size-budget). The
 * partner referral path (no `referrerClinicId`) is anchored the same
 * way but does not grant free-month credits — the revenue-share
 * accrual handles the partner payout downstream.
 */
@Injectable()
export class ReferralFirstPaymentCreditService {
  private readonly logger = new Logger(ReferralFirstPaymentCreditService.name);

  constructor(
    @Inject(PARTNER_PERSISTENCE_PORT)
    private readonly prisma: PartnerPersistencePort,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async applyOnFirstPayment(clinicId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const paymentCount = await tx.subscriptionPayment.count({
        where: { clinicId, status: 'paid' },
      });
      if (paymentCount > 1) return;

      const referral = await tx.referral.findFirst({
        where: {
          referredClinicId: clinicId,
          status: 'SIGNED_UP',
          creditApplied: false,
        },
        include: { referrerClinic: true },
      });
      if (!referral) return;

      // Partner path: the referral carries a Referrer (not a Clinic),
      // so there are no free-month credits to grant here. We still
      // flip the row to CONVERTED and anchor activationAt so the
      // existing ReferralAccrualService can pick it up for the
      // revenue-share ledger. Discount (if any) was set on capture
      // from the first rate band; consumed here.
      if (!referral.referrerClinicId) {
        await tx.referral.updateMany({
          where: { id: referral.id, status: 'SIGNED_UP', creditApplied: false },
          data: {
            status: 'CONVERTED',
            creditApplied: true,
            discountApplied: true,
            convertedAt: this.clock.now(),
            activationAt: this.clock.now(),
          },
        });
        this.logger.log(
          `Anchored partner referral ${referral.id} for clinic ${clinicId} (revenue-share accrual will pick up)`,
        );
        return;
      }

      const referrerCredits =
        referral.referrerClinic?.referralCreditsMonths || 0;
      if (referrerCredits >= MAX_REFERRAL_CREDITS_PER_YEAR) {
        this.logger.warn(
          `Referrer ${referral.referrerClinicId} has reached credit cap`,
        );
        return;
      }

      const flipped = await tx.referral.updateMany({
        where: { id: referral.id, status: 'SIGNED_UP', creditApplied: false },
        data: {
          status: 'CONVERTED',
          creditApplied: true,
          // The referred clinic's first-invoice discount is realized on the same
          // first successful payment — mark it consumed so it can't be re-claimed.
          discountApplied: true,
          convertedAt: this.clock.now(),
          // First paid activation anchors the revenue-share accrual window
          // ([activation, +12 months]) used by ReferralAccrualService.
          activationAt: this.clock.now(),
        },
      });
      if (flipped.count === 0) return;

      await tx.clinic.update({
        where: { id: referral.referrerClinicId },
        data: { referralCreditsMonths: { increment: 1 } },
      });
      await tx.referralCredit.create({
        data: {
          clinicId: referral.referrerClinicId,
          referralId: referral.id,
          creditMonths: 1,
        },
      });
      this.logger.log(
        `Applied referral credit to clinic ${referral.referrerClinicId} from referral ${referral.id}`,
      );
    });
  }
}
