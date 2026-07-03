import { Inject, Injectable, Logger } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { PrismaService } from '@/prisma/prisma.service';
import {
  MAX_REFERRAL_CREDITS_PER_YEAR,
  REFERRAL_DISCOUNT_PERCENT,
} from '@workspace/types';

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
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
   * Links a signing-up clinic to its referrer from a referral code (the
   * referrer clinic's unique `referralCode`). Creates a SIGNED_UP referral the
   * downstream discount/credit/accrual all key off. One reward per referred
   * clinic, EVER — a clinic already carrying a referral is never re-linked, and
   * self-referral is rejected. No-op (never throws) so a bad code can't block
   * onboarding.
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
      },
    });
    return { linked: true };
  }

  async applyReferralCreditsOnFirstPayment(clinicId: string): Promise<void> {
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
    return {
      discountCents,
      finalAmountCents: amountCents - discountCents,
    };
  }
}
