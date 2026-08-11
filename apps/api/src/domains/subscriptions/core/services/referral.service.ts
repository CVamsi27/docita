import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import {
  PARTNER_PERSISTENCE_PORT,
  type PartnerPersistencePort,
} from '@/domains/subscriptions/application/ports/partner-persistence.port';
import { ApplicationEvents } from '@/shared/common/events/application-events';
import {
  REFERRAL_DISCOUNT_PERCENT,
  type ApplyReferralCodeResult,
  type ClinicReferralStatus,
} from '@workspace/types';
import { firstRateBandPercent } from './referral-reward.rules';
import { ReferralConversionCreditService } from './referral-conversion-credit.service';

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(
    @Inject(PARTNER_PERSISTENCE_PORT)
    private prisma: PartnerPersistencePort,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
    private readonly firstPaymentCredit: ReferralConversionCreditService,
  ) {}

  async validateReferralCode(
    referralCode: string,
    clinicEmail: string,
  ): Promise<boolean> {
    const referral = await this.prisma.referral.findFirst({
      where: {
        referralCode,
        referredEmail: clinicEmail,
        status: 'SIGNED_UP',
      },
    });

    return !!referral && !referral.discountApplied;
  }

  /**
   * Listen for the post-onboarding event emitted by clinics.onboarding and
   * run captureReferralAtSignup. Non-fatal — a referral hiccup must never
   * bubble back into the onboarding flow that already succeeded. This is the
   * only correct cross-domain seam: clinics.application cannot import
   * subscriptions.core.services (the cross-domain-import check forbids it),
   * so we go through ApplicationEvents.
   */
  @OnEvent(ApplicationEvents.CLINIC_ONBOARDED)
  async handleClinicOnboarded(payload: {
    clinicId: string;
    clinicEmail: string | null;
    referralCode: string;
  }): Promise<void> {
    try {
      await this.captureReferralAtSignup(payload);
    } catch (error) {
      this.logger.error(
        `Referral capture failed for clinic ${payload.clinicId} (onboarding unaffected)`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Links a signing-up clinic to its referrer from a referral code. Two
   * shapes share the same row layout:
   *   - `Referrer.code` (new `RFR-XXXXXX` partner path) → sets
   *     `referrerId` (no `referrerClinicId`); discount is the first rate band.
   *   - `Clinic.referralCode` (legacy clinic-to-clinic path) → sets
   *     `referrerClinicId`; discount is the global clinic default.
   *
   * One reward per referred clinic, EVER — a clinic already carrying a
   * referral is never re-linked. Self-referral is rejected. No-op
   * (never throws) so a bad code can't block onboarding.
   */
  async captureReferralAtSignup(input: {
    clinicId: string;
    clinicEmail: string | null;
    referralCode: string;
  }): Promise<{ linked: boolean }> {
    const code = input.referralCode.trim();
    if (!code) return { linked: false };

    const existing = await this.prisma.referral.findFirst({
      where: { referredClinicId: input.clinicId },
      select: { id: true },
    });
    if (existing) return { linked: false };

    // Resolve against the new partner path first (Referrer.code), then
    // the legacy clinic path. Same code table; different rows.
    const partner = await this.prisma.referrer.findUnique({
      where: { code },
      select: {
        id: true,
        active: true,
        type: true,
        rateBands: true,
      },
    });
    if (partner && partner.active) {
      const discountPercent = firstRateBandPercent(partner.rateBands);
      await this.prisma.referral.create({
        data: {
          referrerId: partner.id,
          referredClinicId: input.clinicId,
          referredEmail: input.clinicEmail ?? '',
          referralCode: code,
          status: 'SIGNED_UP',
          discountPercent,
        },
      });
      return { linked: true };
    }

    const referrerClinic = await this.prisma.clinic.findUnique({
      where: { referralCode: code },
      select: { id: true },
    });
    if (!referrerClinic || referrerClinic.id === input.clinicId) {
      return { linked: false };
    }

    await this.prisma.referral.create({
      data: {
        referrerClinicId: referrerClinic.id,
        referredClinicId: input.clinicId,
        referredEmail: input.clinicEmail ?? '',
        referralCode: code,
        status: 'SIGNED_UP',
        discountPercent: REFERRAL_DISCOUNT_PERCENT,
      },
    });
    return { linked: true };
  }

  /**
   * Settings-page entry point for an existing clinic. Same semantics as
   * `captureReferralAtSignup` but throws on bad input (this is a user-
   * initiated action, not a post-onboarding side effect, so the
   * caller wants to surface the error to the user).
   *
   * Returns the resolved source so the UI can show "applied by <name>"
   * on success.
   */
  async applyReferralCodeAtSettings(
    clinicId: string,
    rawCode: string,
  ): Promise<ApplyReferralCodeResult> {
    const code = rawCode.trim();
    if (!code) return { applied: false, reason: 'INVALID' };

    const existing = await this.prisma.referral.findFirst({
      where: { referredClinicId: clinicId },
      select: { id: true },
    });
    if (existing) return { applied: false, reason: 'ALREADY_LINKED' };

    const partner = await this.prisma.referrer.findUnique({
      where: { code },
      select: { id: true, active: true, type: true, rateBands: true },
    });
    if (partner && partner.active) {
      const discountPercent = firstRateBandPercent(partner.rateBands);
      await this.prisma.referral.create({
        data: {
          referrerId: partner.id,
          referredClinicId: clinicId,
          referredEmail: '',
          referralCode: code,
          status: 'SIGNED_UP',
          discountPercent,
        },
      });
      // prettier-ignore
      return { applied: true, source: 'PARTNER', referrerId: partner.id, clinicId };
    }

    const referrerClinic = await this.prisma.clinic.findUnique({
      where: { referralCode: code },
      select: { id: true },
    });
    if (!referrerClinic) return { applied: false, reason: 'INVALID' };
    if (referrerClinic.id === clinicId) {
      return { applied: false, reason: 'SELF' };
    }
    await this.prisma.referral.create({
      data: {
        referrerClinicId: referrerClinic.id,
        referredClinicId: clinicId,
        referredEmail: '',
        referralCode: code,
        status: 'SIGNED_UP',
        discountPercent: REFERRAL_DISCOUNT_PERCENT,
      },
    });
    // prettier-ignore
    return { applied: true, source: 'CLINIC', referrerId: referrerClinic.id, clinicId: referrerClinic.id };
  }

  /** Read-back for the settings page: what code (if any) is this clinic
   *  currently linked to? Returns null when the clinic has no Referral. */
  async getClinicReferralStatus(
    clinicId: string,
  ): Promise<ClinicReferralStatus> {
    const referral = await this.prisma.referral.findFirst({
      where: { referredClinicId: clinicId },
      orderBy: { createdAt: 'desc' },
      select: {
        referralCode: true,
        status: true,
        discountApplied: true,
        referrerId: true,
        referrerClinicId: true,
      },
    });
    if (!referral) {
      return { code: null, source: null, status: null, discountApplied: false };
    }
    return {
      code: referral.referralCode,
      source: referral.referrerId ? 'PARTNER' : 'CLINIC',
      status: referral.status,
      discountApplied: referral.discountApplied,
    };
  }

  /**
   * Realize a referral on the first successful payment. Non-fatal wrapper: a
   * referral hiccup must never abort a completed, paid activation. Idempotent and
   * first-payment-guarded via applyReferralCreditsOnFirstPayment.
   */
  async realizeReferralOnFirstPayment(clinicId: string): Promise<void> {
    try {
      await this.applyReferralCreditsOnFirstPayment(clinicId);
    } catch (error) {
      this.logger.error(
        `Referral realization failed for clinic ${clinicId} (activation unaffected)`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async applyReferralCreditsOnFirstPayment(clinicId: string): Promise<void> {
    return this.firstPaymentCredit.applyOnFirstPayment(clinicId);
  }

  async getReferralCredits(clinicId: string) {
    return this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: {
        referralCreditsMonths: true,
        referralCode: true,
      },
    });
  }

  async getReferralHistory(referrerClinicId: string) {
    return this.prisma.referral.findMany({
      where: { referrerClinicId },
      include: {
        referredClinic: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      // Capped: a single clinic's referral history is a small set; 500 is
      // a guardrail well above realistic scale (a clinic rarely refers
      // hundreds of other clinics).
      take: 500,
    });
  }

  async markReferralDiscountApplied(referralId: string): Promise<void> {
    await this.prisma.referral.update({
      where: { id: referralId },
      data: { discountApplied: true },
    });
  }

  /**
   * First-invoice referral discount (in paise) for a newly-signing clinic, or 0
   * when there is no redeemable referral. Redeemable = a SIGNED_UP referral for
   * this clinic (by id or invited email) whose discount has not been consumed.
   * One-per-clinic and one-time are enforced by the `discountApplied` flag, which
   * is flipped on the first successful payment (applyReferralCreditsOnFirstPayment).
   */
  async getRedeemableReferralDiscountCents(
    clinicId: string,
    clinicEmail: string | null,
    amountCents: number,
  ): Promise<number> {
    if (amountCents <= 0) return 0;
    const referral = await this.prisma.referral.findFirst({
      where: {
        status: 'SIGNED_UP',
        discountApplied: false,
        OR: [
          { referredClinicId: clinicId },
          ...(clinicEmail ? [{ referredEmail: clinicEmail }] : []),
        ],
      },
      select: { discountPercent: true },
    });
    if (!referral) return 0;
    const pct = Math.min(100, Math.max(0, referral.discountPercent));
    return Math.min(amountCents, Math.round((amountCents * pct) / 100));
  }

  calculateReferralDiscount(amountCents: number): {
    discountCents: number;
    finalAmountCents: number;
  } {
    const discountCents = Math.round(
      amountCents * (REFERRAL_DISCOUNT_PERCENT / 100),
    );
    return { discountCents, finalAmountCents: amountCents - discountCents };
  }
}
