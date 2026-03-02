import {
  ClinicTier,
  BillingCycle,
  SubscriptionPrice,
  DiscountAggregate,
} from '@/domains/subscriptions/core/value-objects';
import { ANNUAL_DISCOUNT_PERCENT, TIER_PRICING } from '@workspace/types';

export class SubscriptionPricingService {
  getPricePaise(tier: ClinicTier, cycle: BillingCycle): number {
    const tierName = tier.toString() as keyof typeof TIER_PRICING;
    const pricing = TIER_PRICING[tierName];
    if (!pricing) {
      throw new Error(`Pricing not found for tier: ${tier.toString()}`);
    }

    let paise = 0;
    if (cycle.isYearly()) {
      const yearlyPrice = pricing.yearly;
      paise = typeof yearlyPrice === 'number' ? yearlyPrice * 100 : 0;
    } else {
      const monthlyPrice = pricing.monthly;
      paise = typeof monthlyPrice === 'number' ? monthlyPrice * 100 : 0;
    }

    return paise;
  }

  calculatePrice(
    tier: ClinicTier,
    cycle: BillingCycle,
    addOns: string[] = [],
  ): number {
    let totalPricePaise = this.getPricePaise(tier, cycle);

    if (addOns.includes('INTELLIGENCE')) {
      const intelligencePrice = cycle.isYearly() ? 120000 : 12000;
      totalPricePaise += intelligencePrice;
    }

    return totalPricePaise;
  }

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

  getAnnualDiscount(): number {
    return ANNUAL_DISCOUNT_PERCENT;
  }

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
