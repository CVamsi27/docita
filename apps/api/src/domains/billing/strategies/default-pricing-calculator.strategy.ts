import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  PricingCalculatorStrategy,
  PricingCalculationResult,
} from './pricing-calculator.interface';
import { ClinicTier, BillingCycle, DiscountType } from '@workspace/db';
import {
  TIER_PRICING_BY_CURRENCY,
  INTELLIGENCE_ADDON_PRICING_BY_CURRENCY,
  ANNUAL_DISCOUNT_PERCENT,
  REFERRAL_DISCOUNT_PERCENT,
  SupportedCurrency,
  type TierName,
} from '@workspace/types';
import { DEFAULT_CURRENCY } from '@workspace/utils';

@Injectable()
export class DefaultPricingCalculatorStrategy implements PricingCalculatorStrategy {
  constructor(private prisma: PrismaService) {}

  private isTierName(value: string): value is TierName {
    return value in TIER_PRICING_BY_CURRENCY.INR;
  }

  async calculatePrice(params: {
    tier: ClinicTier;
    cycle: BillingCycle;
    addOns?: string[];
    discountType?: DiscountType;
    referralCredits?: number;
    currency?: string;
  }): Promise<PricingCalculationResult> {
    const currency = (params.currency?.toUpperCase() ||
      DEFAULT_CURRENCY) as SupportedCurrency;
    const tierPricing = TIER_PRICING_BY_CURRENCY[currency];
    const intelligencePricing =
      INTELLIGENCE_ADDON_PRICING_BY_CURRENCY[currency];

    const tierName = this.isTierName(params.tier) ? params.tier : 'CORE';
    const tierConfig = tierPricing[tierName];
    let basePriceCents = 0;

    const monthlyPrice =
      typeof tierConfig.monthly === 'number' ? tierConfig.monthly : 0;

    if (params.cycle === 'YEARLY') {
      basePriceCents = Math.round(
        monthlyPrice * 12 * (1 - ANNUAL_DISCOUNT_PERCENT / 100) * 100,
      );
    } else if (params.cycle === 'MONTHLY') {
      basePriceCents = monthlyPrice * 100;
    } else if (params.cycle === 'QUARTERLY') {
      basePriceCents = Math.round(monthlyPrice * 3 * 100);
    }

    let addOnsCents = 0;
    const addOnBreakdown: Array<{ name: string; priceCents: number }> = [];
    const addOnTierKey = tierName === 'CAPTURE' ? 'CORE' : tierName;
    const isAddOnEligible = !['CAPTURE'].includes(params.tier);

    if (isAddOnEligible && params.addOns?.includes('INTELLIGENCE')) {
      const intelligenceConfig = intelligencePricing[addOnTierKey];
      if (
        intelligenceConfig &&
        typeof intelligenceConfig.basePrice === 'number'
      ) {
        const intelligencePrice =
          params.cycle === 'YEARLY'
            ? Math.round(
                intelligenceConfig.basePrice *
                  12 *
                  (1 - ANNUAL_DISCOUNT_PERCENT / 100) *
                  100,
              )
            : intelligenceConfig.basePrice * 100;

        addOnsCents += intelligencePrice;
        addOnBreakdown.push({
          name: 'AI Intelligence',
          priceCents: intelligencePrice,
        });
      }
    }

    let discountCents = 0;
    const discountBreakdown: Array<{ name: string; amountCents: number }> = [];

    if (params.discountType) {
      const discount = await this.prisma.discount.findUnique({
        where: {
          type: params.discountType,
          isActive: true,
        },
      });

      if (discount) {
        const percentOff = discount.percentOff;
        discountCents = Math.round(
          ((basePriceCents + addOnsCents) * percentOff) / 100,
        );
        discountBreakdown.push({
          name: discount.name,
          amountCents: discountCents,
        });
      }
    }

    if (params.referralCredits && params.referralCredits > 0) {
      const maxReferralDiscount = Math.round(
        ((basePriceCents + addOnsCents) * REFERRAL_DISCOUNT_PERCENT) / 100,
      );
      const referralDiscount = Math.min(
        params.referralCredits * 100,
        maxReferralDiscount,
      );
      discountCents += referralDiscount;
      discountBreakdown.push({
        name: 'Referral Credits',
        amountCents: referralDiscount,
      });
    }

    const subtotal = basePriceCents + addOnsCents - discountCents;
    const taxCents = 0;

    const totalCents = subtotal + taxCents;

    return {
      basePriceCents,
      addOnsCents,
      discountCents,
      taxCents,
      totalCents,
      breakdown: {
        tier: params.tier,
        cycle: params.cycle,
        addOns: addOnBreakdown,
        discounts: discountBreakdown,
      },
    };
  }

  async calculateProration(params: {
    currentTier: ClinicTier;
    newTier: ClinicTier;
    currentCycle: BillingCycle;
    daysRemaining: number;
    currentAddOns?: string[];
    newAddOns?: string[];
  }): Promise<{
    creditCents: number;
    chargeCents: number;
    netChargeCents: number;
  }> {
    const billingCycleDays = params.currentCycle === 'YEARLY' ? 365 : 30;

    const currentPrice = await this.calculatePrice({
      tier: params.currentTier,
      cycle: params.currentCycle,
      addOns: params.currentAddOns,
    });

    const newPrice = await this.calculatePrice({
      tier: params.newTier,
      cycle: params.currentCycle,
      addOns: params.newAddOns,
    });

    const creditCents = Math.round(
      (params.daysRemaining / billingCycleDays) * currentPrice.totalCents,
    );

    const chargeCents = newPrice.totalCents;

    const netChargeCents = chargeCents - creditCents;

    return {
      creditCents,
      chargeCents,
      netChargeCents,
    };
  }

  isValid(): boolean {
    return true;
  }
}
