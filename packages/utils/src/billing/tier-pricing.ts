import {
  type AddOnPricing,
  INTELLIGENCE_ADDON_PRICING_BY_CURRENCY,
  type MultiCurrencyTierPricing,
  REFERRAL_REWARDS_BY_CURRENCY,
  type SupportedCurrency,
  TIER_OVERAGE_RATES_BY_CURRENCY,
  TIER_PRICING_BY_CURRENCY,
  type TierName,
  WHATSAPP_ADDON_PRICING_BY_CURRENCY,
} from "@workspace/types";

/**
 * Currency-aware lookups against the multi-currency pricing tables in
 * `@workspace/types`. These were previously co-located with the data tables
 * but are pure runtime functions, so they live in utils per §15.3.
 */
export function getTierPricingByCurrency(
  tier: TierName,
  currency: SupportedCurrency = "INR",
): MultiCurrencyTierPricing {
  return TIER_PRICING_BY_CURRENCY[currency][tier];
}

export function getOverageRatesByCurrency(
  tier: TierName,
  currency: SupportedCurrency = "INR",
) {
  return TIER_OVERAGE_RATES_BY_CURRENCY[currency][tier];
}

export function getWhatsAppAddonPricingByCurrency(
  tier: Exclude<TierName, "STARTER" | "INTELLIGENCE">,
  currency: SupportedCurrency = "INR",
): AddOnPricing {
  return WHATSAPP_ADDON_PRICING_BY_CURRENCY[currency][tier];
}

export function getIntelligenceAddonPricingByCurrency(
  tier: Exclude<TierName, "STARTER" | "INTELLIGENCE">,
  currency: SupportedCurrency = "INR",
): AddOnPricing {
  return INTELLIGENCE_ADDON_PRICING_BY_CURRENCY[currency][tier];
}

export function getReferralRewardByCurrency(
  tier: TierName,
  currency: SupportedCurrency = "INR",
): number {
  return REFERRAL_REWARDS_BY_CURRENCY[currency][tier];
}
