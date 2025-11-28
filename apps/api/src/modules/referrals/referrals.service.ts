/**
 * Referral Service
 * Handles referral program logic with anti-abuse measures
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { randomBytes } from 'crypto';

const REFERRER_REWARD_MONTHS = 1; // 1 free month for referrer
const REFERRED_DISCOUNT_PERCENT = 25; // 25% off first month for referred
const MAX_REFERRAL_CREDITS = 12; // Maximum 12 months of credits per clinic

interface ReferralStats {
  totalReferrals: number;
  pendingReferrals: number;
  convertedReferrals: number;
  totalCreditsEarned: number;
  creditsRemaining: number;
}

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Generate or get referral code for a clinic
   */
  async getOrCreateReferralCode(clinicId: string): Promise<string> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { referralCode: true, name: true },
    });

    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    if (clinic.referralCode) {
      return clinic.referralCode;
    }

    // Generate new referral code
    const code = this.generateReferralCode(clinic.name);

    await this.prisma.clinic.update({
      where: { id: clinicId },
      data: { referralCode: code },
    });

    return code;
  }

  /**
   * Apply referral code during signup/subscription
   */
  async applyReferralCode(
    referredClinicId: string,
    referralCode: string,
    referredEmail: string,
  ): Promise<{
    success: boolean;
    discountPercent: number;
    referrerClinicName: string;
  }> {
    // Find referrer clinic
    const referrerClinic = await this.prisma.clinic.findFirst({
      where: { referralCode: referralCode },
      select: { id: true, name: true, referralCreditsMonths: true },
    });

    if (!referrerClinic) {
      throw new BadRequestException('Invalid referral code');
    }

    // Cannot refer yourself
    if (referrerClinic.id === referredClinicId) {
      throw new BadRequestException('You cannot use your own referral code');
    }

    // Get referred clinic
    const referredClinic = await this.prisma.clinic.findUnique({
      where: { id: referredClinicId },
      select: { id: true, email: true },
    });

    if (!referredClinic) {
      throw new NotFoundException('Clinic not found');
    }

    // Anti-abuse: Extract domain from email
    const referredDomain = this.extractDomainFromEmail(
      referredEmail || referredClinic.email,
    );

    // Check if already referred
    const existingReferral = await this.prisma.referral.findFirst({
      where: { referredClinicId: referredClinicId },
    });

    if (existingReferral) {
      throw new BadRequestException('This clinic has already been referred');
    }

    // Check if referrer has reached max credits
    if ((referrerClinic.referralCreditsMonths || 0) >= MAX_REFERRAL_CREDITS) {
      this.logger.warn(
        `Referrer ${referrerClinic.id} has reached max credits but code used by ${referredClinicId}`,
      );
    }

    // Create referral record
    await this.prisma.referral.create({
      data: {
        referrerClinicId: referrerClinic.id,
        referredClinicId: referredClinicId,
        referredEmail: referredEmail || referredClinic.email,
        referredDomain,
        referralCode: referralCode,
        status: 'SIGNED_UP',
        discountPercent: REFERRED_DISCOUNT_PERCENT,
        signedUpAt: new Date(),
      },
    });

    this.logger.log(
      `Referral code ${referralCode} applied by clinic ${referredClinicId}`,
    );

    return {
      success: true,
      discountPercent: REFERRED_DISCOUNT_PERCENT,
      referrerClinicName: referrerClinic.name,
    };
  }

  /**
   * Convert referral on first payment (give credit to referrer)
   */
  async convertReferral(referredClinicId: string): Promise<void> {
    const referral = await this.prisma.referral.findFirst({
      where: {
        referredClinicId: referredClinicId,
        status: 'SIGNED_UP',
      },
      include: {
        referrerClinic: {
          select: { id: true, referralCreditsMonths: true },
        },
      },
    });

    if (!referral) {
      this.logger.log(
        `No pending referral found for clinic ${referredClinicId}`,
      );
      return;
    }

    const referrer = referral.referrerClinic;
    const currentCredits = referrer.referralCreditsMonths || 0;

    // Check if referrer can still receive credits
    const canReceiveCredit = currentCredits < MAX_REFERRAL_CREDITS;

    await this.prisma.$transaction([
      // Update referral status
      this.prisma.referral.update({
        where: { id: referral.id },
        data: {
          status: 'CONVERTED',
          convertedAt: new Date(),
          creditApplied: canReceiveCredit,
        },
      }),

      // Credit referrer (if under cap)
      ...(canReceiveCredit
        ? [
            this.prisma.clinic.update({
              where: { id: referrer.id },
              data: {
                referralCreditsMonths: {
                  increment: REFERRER_REWARD_MONTHS,
                },
              },
            }),
            this.prisma.referralCredit.create({
              data: {
                clinicId: referrer.id,
                referralId: referral.id,
                creditMonths: REFERRER_REWARD_MONTHS,
              },
            }),
          ]
        : []),
    ]);

    this.logger.log(
      `Referral converted for clinic ${referredClinicId}. Referrer ${referrer.id} credited: ${canReceiveCredit}`,
    );
  }

  /**
   * Get referral discount for checkout
   */
  async getReferralDiscount(clinicId: string): Promise<{
    hasDiscount: boolean;
    discountPercent: number;
    referralCode?: string;
  }> {
    const referral = await this.prisma.referral.findFirst({
      where: {
        referredClinicId: clinicId,
        status: 'SIGNED_UP',
        discountApplied: false,
      },
    });

    if (!referral) {
      return { hasDiscount: false, discountPercent: 0 };
    }

    return {
      hasDiscount: true,
      discountPercent: referral.discountPercent,
      referralCode: referral.referralCode,
    };
  }

  /**
   * Get referral statistics for a clinic
   */
  async getReferralStats(clinicId: string): Promise<ReferralStats> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { referralCreditsMonths: true },
    });

    const referrals = await this.prisma.referral.groupBy({
      by: ['status'],
      where: { referrerClinicId: clinicId },
      _count: { status: true },
    });

    const statusCounts = referrals.reduce(
      (acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      },
      {} as Record<string, number>,
    );

    const totalCredits = await this.prisma.referralCredit.aggregate({
      where: { clinicId: clinicId },
      _sum: { creditMonths: true },
    });

    return {
      totalReferrals:
        (statusCounts['PENDING'] || 0) +
        (statusCounts['CONVERTED'] || 0) +
        (statusCounts['SIGNED_UP'] || 0),
      pendingReferrals:
        (statusCounts['PENDING'] || 0) + (statusCounts['SIGNED_UP'] || 0),
      convertedReferrals: statusCounts['CONVERTED'] || 0,
      totalCreditsEarned: totalCredits._sum?.creditMonths || 0,
      creditsRemaining: clinic?.referralCreditsMonths || 0,
    };
  }

  /**
   * Get referral history for a clinic
   */
  async getReferralHistory(clinicId: string) {
    return this.prisma.referral.findMany({
      where: { referrerClinicId: clinicId },
      include: {
        referredClinic: {
          select: {
            id: true,
            name: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Validate referral code without applying it
   */
  async validateReferralCode(
    referralCode: string,
    clinicId?: string,
  ): Promise<{
    valid: boolean;
    referrerName?: string;
    discountPercent?: number;
    error?: string;
  }> {
    const referrerClinic = await this.prisma.clinic.findFirst({
      where: { referralCode: referralCode },
      select: { id: true, name: true },
    });

    if (!referrerClinic) {
      return { valid: false, error: 'Invalid referral code' };
    }

    if (clinicId && referrerClinic.id === clinicId) {
      return { valid: false, error: 'You cannot use your own referral code' };
    }

    return {
      valid: true,
      referrerName: referrerClinic.name,
      discountPercent: REFERRED_DISCOUNT_PERCENT,
    };
  }

  /**
   * Expire old referrals
   */
  async expireOldReferrals(): Promise<number> {
    // Find referrals that have been pending for more than 90 days
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() - 90);

    const result = await this.prisma.referral.updateMany({
      where: {
        status: 'PENDING',
        createdAt: { lt: expiryDate },
      },
      data: { status: 'EXPIRED' },
    });

    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} old referrals`);
    }

    return result.count;
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  private generateReferralCode(clinicName: string): string {
    // Create code from clinic name + random suffix
    const prefix = clinicName
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 6)
      .toUpperCase();
    const suffix = randomBytes(3).toString('hex').toUpperCase().substring(0, 4);
    return `${prefix}${suffix}`;
  }

  private extractDomainFromEmail(email: string): string | null {
    if (!email) return null;
    const parts = email.split('@');
    return parts.length === 2 ? parts[1].toLowerCase() : null;
  }

  private areDomainsSimilar(domain1: string, domain2: string): boolean {
    if (!domain1 || !domain2) return false;

    // Normalize domains
    const normalize = (d: string) =>
      d
        .toLowerCase()
        .replace(/^www\./, '')
        .replace(/\/$/, '');

    const d1 = normalize(domain1);
    const d2 = normalize(domain2);

    // Exact match
    if (d1 === d2) return true;

    // Extract base domain
    const getBaseDomain = (d: string) => {
      const parts = d.split('.');
      if (parts.length >= 2) {
        return parts.slice(-2).join('.');
      }
      return d;
    };

    return getBaseDomain(d1) === getBaseDomain(d2);
  }
}
