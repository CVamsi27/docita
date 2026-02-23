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
  INTELLIGENCE_ADDON_PRICING,
} from '@workspace/types';
import {
  REFERRAL_DISCOUNT_PERCENT,
  SEMI_ANNUAL_DISCOUNT_PERCENT,
} from './subscription.constants';

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
   * Get price in cents (paise) for a tier and billing cycle.
   * Includes yearly discount for add-ons and GST for INR currency.
   */
  getPriceCents(
    tier: ClinicTier,
    cycle: BillingCycle,
    addOns: string[] = [],
    currency: string = 'INR',
  ): number {
    const pricing = TIER_PRICING[tier];
    if (!pricing) return 0;

    let subtotalCents = 0;

    // Base Plan Price
    if (cycle === 'YEARLY') {
      const yearlyPrice = pricing.yearly;
      subtotalCents += typeof yearlyPrice === 'number' ? yearlyPrice * 100 : 0;
    } else if (cycle === 'SEMI_ANNUAL') {
      const monthlyPrice = pricing.monthly;
      const sixMonthPrice =
        typeof monthlyPrice === 'number' ? monthlyPrice * 6 : 0;
      subtotalCents += Math.round(
        sixMonthPrice * (1 - SEMI_ANNUAL_DISCOUNT_PERCENT / 100) * 100,
      );
    } else if (cycle === 'QUARTERLY') {
      const monthlyPrice = pricing.monthly;
      subtotalCents +=
        typeof monthlyPrice === 'number' ? monthlyPrice * 3 * 100 : 0;
    } else {
      const monthlyPrice = pricing.monthly;
      subtotalCents +=
        typeof monthlyPrice === 'number' ? monthlyPrice * 100 : 0;
    }

    // Add-ons Price (apply yearly/semi-annual discount)
    if (addOns.includes('INTELLIGENCE') && tier !== 'CAPTURE') {
      const intelligencePricing = INTELLIGENCE_ADDON_PRICING[tier];
      if (intelligencePricing) {
        const addOnMonthly =
          typeof intelligencePricing.basePrice === 'number'
            ? intelligencePricing.basePrice
            : 0;
        if (cycle === 'YEARLY') {
          subtotalCents += Math.round(
            addOnMonthly * 12 * (1 - ANNUAL_DISCOUNT_PERCENT / 100) * 100,
          );
        } else if (cycle === 'SEMI_ANNUAL') {
          subtotalCents += Math.round(
            addOnMonthly * 6 * (1 - SEMI_ANNUAL_DISCOUNT_PERCENT / 100) * 100,
          );
        } else if (cycle === 'QUARTERLY') {
          subtotalCents += addOnMonthly * 3 * 100;
        } else {
          subtotalCents += addOnMonthly * 100;
        }
      }
    }

    // GST is inclusive in the listed prices for all currencies
    return subtotalCents;
  }

  /**
   * Get billing cycle days
   */
  getBillingCycleDays(cycle: BillingCycle): number {
    switch (cycle) {
      case 'YEARLY':
        return 365;
      case 'SEMI_ANNUAL':
        return 180;
      case 'QUARTERLY':
        return 90;
      default:
        return 30;
    }
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
