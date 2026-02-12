/**
 * Referral Service
 * 
 * Handles referral program logic:
 * - Referral discount application
 * - Credit application on first payment
 * - Referral tracking and rewards
 * 
 * Single Responsibility: Referral program management and credit tracking
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const MAX_REFERRAL_CREDITS_PER_YEAR = 12;
const REFERRAL_DISCOUNT_PERCENT = 25;

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Check if a referral code is valid and applicable for discount
   */
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
   * Apply referral credits after first successful payment
   */
  async applyReferralCreditsOnFirstPayment(clinicId: string): Promise<void> {
    // Check if this is the first payment
    const paymentCount = await this.prisma.subscriptionPayment.count({
      where: {
        clinicId,
        status: 'paid',
      },
    });

    if (paymentCount > 1) {
      return; // Not first payment
    }

    // Find pending referral for this clinic
    const referral = await this.prisma.referral.findFirst({
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

    // Check referrer's credit cap
    const referrerCredits = referral.referrerClinic.referralCreditsMonths || 0;
    if (referrerCredits >= MAX_REFERRAL_CREDITS_PER_YEAR) {
      this.logger.warn(
        `Referrer ${referral.referrerClinicId} has reached credit cap`,
      );
      return;
    }

    // Apply credit to referrer
    await this.prisma.$transaction([
      // Update referrer's credit months
      this.prisma.clinic.update({
        where: { id: referral.referrerClinicId },
        data: {
          referralCreditsMonths: {
            increment: 1,
          },
        },
      }),
      // Create credit record
      this.prisma.referralCredit.create({
        data: {
          clinicId: referral.referrerClinicId,
          referralId: referral.id,
          creditMonths: 1,
        },
      }),
      // Update referral status
      this.prisma.referral.update({
        where: { id: referral.id },
        data: {
          status: 'CONVERTED',
          creditApplied: true,
          convertedAt: new Date(),
        },
      }),
    ]);

    this.logger.log(
      `Applied referral credit to clinic ${referral.referrerClinicId} from referral ${referral.id}`,
    );
  }

  /**
   * Get referral credit information for a clinic
   */
  async getReferralCredits(clinicId: string) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: {
        referralCreditsMonths: true,
        referralCode: true,

      },
    });

    return clinic;
  }

  /**
   * Get referral history for a clinic
   */
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

  /**
   * Mark referral discount as applied
   * Called when checkout is created with a referral code
   */
  async markReferralDiscountApplied(referralId: string): Promise<void> {
    await this.prisma.referral.update({
      where: { id: referralId },
      data: { discountApplied: true },
    });
  }

  /**
   * Calculate discounted amount based on referral
   */
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
