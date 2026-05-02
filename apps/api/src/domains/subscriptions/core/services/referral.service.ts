import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  MAX_REFERRAL_CREDITS_PER_YEAR,
  REFERRAL_DISCOUNT_PERCENT,
} from '@workspace/types';

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(private prisma: PrismaService) {}

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

  async applyReferralCreditsOnFirstPayment(clinicId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const paymentCount = await tx.subscriptionPayment.count({
        where: {
          clinicId,
          status: 'paid',
        },
      });

      if (paymentCount > 1) {
        return;
      }

      const referral = await tx.referral.findFirst({
        where: {
          referredClinicId: clinicId,
          status: 'SIGNED_UP',
          creditApplied: false,
        },
        include: {
          referrerClinic: true,
        },
      });

      if (!referral) {
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
        where: {
          id: referral.id,
          status: 'SIGNED_UP',
          creditApplied: false,
        },
        data: {
          status: 'CONVERTED',
          creditApplied: true,
          convertedAt: new Date(),
        },
      });

      if (flipped.count === 0) {
        return;
      }

      await tx.clinic.update({
        where: { id: referral.referrerClinicId },
        data: {
          referralCreditsMonths: { increment: 1 },
        },
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
