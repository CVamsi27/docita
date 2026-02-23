/**
 * Subscription Pricing Service
 * Calculates prices based on tier, cycle, and discounts
 */

import {
  ClinicTier,
  BillingCycle,
  SubscriptionPrice,
  DiscountAggregate,
} from '../value-objects';

// This would typically come from configuration
// For now, using constants
const TIER_PRICING: Record<string, { monthly: number; yearly: number }> = {
  CAPTURE: { monthly: 0, yearly: 0 },
  CORE: { monthly: 999, yearly: 9990 },
  GROWTH: { monthly: 4999, yearly: 49990 },
  SCALE: { monthly: 9999, yearly: 99990 },
  ENTERPRISE: { monthly: 19999, yearly: 199990 }, // Custom, should be requested
};

const ANNUAL_DISCOUNT_PERCENT = 17;

export class SubscriptionPricingService {
  /**
   * Get price in paise for a tier and cycle
   */
  getPricePaise(tier: ClinicTier, cycle: BillingCycle): number {
    const pricing = TIER_PRICING[tier.toString()];
    if (!pricing) {
      throw new Error(`Pricing not found for tier: ${tier.toString()}`);
    }

    let paise = 0;
    if (cycle.isYearly()) {
      const yearlyPrice = pricing.yearly;
      paise = yearlyPrice * 100;
    } else {
      const monthlyPrice = pricing.monthly;
      paise = monthlyPrice * 100;
    }

    return paise;
  }

  /**
   * Get effective price after discounts
   */
  getEffectivePrice(
    tier: ClinicTier,
    cycle: BillingCycle,
    discounts: DiscountAggregate,
  ): SubscriptionPrice {
    const basePaise = this.getPricePaise(tier, cycle);
    const basePrice = new SubscriptionPrice(basePaise);
    const discountPercent = discounts.getTotalPercent();
    return basePrice.applyDiscount(discountPercent);
  }

  /**
   * Calculate discount for annual billing
   */
  getAnnualDiscount(): number {
    return ANNUAL_DISCOUNT_PERCENT;
  }

  /**
   * Suggest plan upgrade/downgrade pricing
   */
  suggestPlanChange(
    currentTier: ClinicTier,
    newTier: ClinicTier,
    cycle: BillingCycle,
  ): { current: number; new: number } {
    return {
      current: this.getPricePaise(currentTier, cycle),
      new: this.getPricePaise(newTier, cycle),
    };
  }
}
