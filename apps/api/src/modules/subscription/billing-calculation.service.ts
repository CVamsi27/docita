/**
 * Billing Calculation Service
 * 
 * Handles all pricing and calculation logic:
 * - Tier pricing retrieval
 * - Proration calculations
 * - Add-on pricing
 * - Discount calculations
 * 
 * Single Responsibility: Pricing and calculation math only
 */

import { Injectable, Logger } from '@nestjs/common';
import { ClinicTier, BillingCycle } from '@workspace/db';
import {
  TIER_PRICING,
  ANNUAL_DISCOUNT_PERCENT,
  WHATSAPP_ADDON_PRICING,
} from '@workspace/types';

const REFERRAL_DISCOUNT_PERCENT = 25;

export interface ProratedAmount {
  creditCents: number;
  chargeCents: number;
  daysRemaining: number;
  billingCycleDays: number;
}

export interface ProrationPreview {
  currentPlan: string;
  newPlan: string;
  currentPriceCents: number;
  newPriceCents: number;
  creditCents: number;
  chargeCents: number;
  daysRemaining: number;
  effectiveDate: Date;
}

@Injectable()
export class BillingCalculationService {
  private readonly logger = new Logger(BillingCalculationService.name);

  /**
   * Get price in cents (paise) for a tier and billing cycle
   */
  getPriceCents(
    tier: ClinicTier,
    cycle: BillingCycle,
    addOns: string[] = [],
  ): number {
    const pricing = TIER_PRICING[tier];
    if (!pricing) return 0;

    let totalCents = 0;

    // Base Plan Price
    if (cycle === 'YEARLY') {
      const yearlyPrice = pricing.yearly;
      totalCents += typeof yearlyPrice === 'number' ? yearlyPrice * 100 : 0;
    } else {
      const monthlyPrice = pricing.monthly;
      totalCents += typeof monthlyPrice === 'number' ? monthlyPrice * 100 : 0;
    }

    // Add-ons Price
    if (addOns.includes('WHATSAPP')) {
      const whatsappPricing =
        WHATSAPP_ADDON_PRICING[tier as keyof typeof WHATSAPP_ADDON_PRICING];
      if (whatsappPricing) {
        const addOnMonthly =
          typeof whatsappPricing.basePrice === 'number'
            ? whatsappPricing.basePrice
            : 0;
        if (cycle === 'YEARLY') {
          totalCents += addOnMonthly * 12 * 100;
        } else {
          totalCents += addOnMonthly * 100;
        }
      }
    }

    return totalCents;
  }

  /**
   * Get billing cycle days
   */
  getBillingCycleDays(cycle: BillingCycle): number {
    return cycle === 'YEARLY' ? 365 : 30;
  }

  /**
   * Calculate proration for plan changes
   */
  calculateProration(
    currentPriceCents: number,
    newPriceCents: number,
    billingCycleDays: number,
    daysRemaining: number,
  ): ProratedAmount {
    // Credit for unused portion of current plan
    const creditCents = Math.round(
      (daysRemaining / billingCycleDays) * currentPriceCents,
    );

    // Charge for new plan (prorated)
    const newPlanProrated = Math.round(
      (daysRemaining / billingCycleDays) * newPriceCents,
    );

    // Net charge (could be negative if downgrading)
    const chargeCents = Math.max(0, newPlanProrated - creditCents);

    return {
      creditCents,
      chargeCents,
      daysRemaining,
      billingCycleDays,
    };
  }

  /**
   * Apply referral discount to an amount
   */
  applyReferralDiscount(amountCents: number): number {
    const discountCents = Math.round(
      amountCents * (REFERRAL_DISCOUNT_PERCENT / 100),
    );
    return amountCents - discountCents;
  }

  /**
   * Calculate days remaining in billing cycle
   */
  calculateDaysRemaining(periodEnd: Date): number {
    const now = new Date();
    return Math.max(
      0,
      Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    );
  }

  /**
   * Calculate grace period days remaining
   */
  calculateGracePeriodDaysRemaining(
    periodEnd: Date,
    gracePeriodDays: number,
  ): number {
    const now = new Date();
    const elapsed = Math.ceil(
      (now.getTime() - periodEnd.getTime()) / (1000 * 60 * 60 * 24),
    );
    return Math.max(0, gracePeriodDays - elapsed);
  }
}
