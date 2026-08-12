import { PRICING_CURRENCY_SYMBOLS, PUBLISHED_PLAN_LADDER, SUBSCRIPTION_TRIAL_DAYS, TIER_OVERAGE_RATES_BY_CURRENCY, type TierName } from "@workspace/types";
import { formatPriceWithCurrency, formatRateWithCurrency, parseSupportedCurrency } from "@workspace/utils";
import { getTierPricing } from "@/lib/subscription/tier-access";
import { type TierPricing } from "@/features/subscription";

// Onboarding plan selection uses the same published clinical ladder as the rest
// of the app — sourced from the single PUBLISHED_PLAN_LADDER catalog (not a
// hardcoded copy) so the order/membership can never drift. The Full / Front
// Desk / Core toggle is exposed on the step; mode comes from the `mode` query.
export const DISPLAY_TIERS: readonly TierName[] = PUBLISHED_PLAN_LADDER;

export const PLAN_AUDIENCE: Record<string, string> = {
  STARTER: "Best for solo doctors starting with full clinic workflows",
  ESSENTIAL:
    "Best for small facilities needing clear limits and simple billing",
  PROFESSIONAL: "Best for multi-doctor facilities and growing practices",
  HOSPITAL: "Best for multi-branch hospitals and specialty groups",
  ENTERPRISE: "Best for hospitals and chains with custom requirements",
};

interface TierCardConfig {
  cardPricing: { monthly: number | "custom"; yearly: number | "custom" };
  currencySymbol: string;
  overageHint: string | undefined;
  buttonLabel: string;
}

export function buildTierCardConfig(
  tierName: TierName,
  resolvedCurrency: string,
  apiTiers: TierPricing[],
): TierCardConfig {
  const tierPricingFromApi = apiTiers.find((t) => t.id === tierName);
  const catalogPricing = getTierPricing(tierName);
  const cardPricing = tierPricingFromApi?.pricing ?? {
    monthly: catalogPricing.monthly,
    yearly: catalogPricing.yearly,
  };

  const currencyKey = parseSupportedCurrency(resolvedCurrency);
  const currencySymbol =
    PRICING_CURRENCY_SYMBOLS[currencyKey] ?? resolvedCurrency;
  const overageRates = (TIER_OVERAGE_RATES_BY_CURRENCY[currencyKey] ??
    TIER_OVERAGE_RATES_BY_CURRENCY.INR)[tierName];
  const overageFromRates =
    overageRates?.appointmentRate > 0
      ? `then ${formatRateWithCurrency(overageRates.appointmentRate, currencyKey)} per extra consultation`
      : undefined;

  // Every plan except Enterprise offers a free trial to new customers.
  const trialLine = `${formatPriceWithCurrency(0, currencyKey)} for the first ${SUBSCRIPTION_TRIAL_DAYS} days, then regular billing`;
  let overageHint: string | undefined;
  if (tierName === "ENTERPRISE") {
    overageHint = "Custom pricing and deployment. Contact sales to continue.";
  } else if (tierName === "HOSPITAL") {
    overageHint = [
      trialLine,
      "Multi-branch billing. Annual contracts available.",
      overageFromRates,
    ]
      .filter(Boolean)
      .join(" ");
  } else {
    overageHint = [trialLine, overageFromRates].filter(Boolean).join(" ");
  }

  const buttonLabel =
    tierName === "ENTERPRISE"
      ? "Contact sales"
      : `Start free ${SUBSCRIPTION_TRIAL_DAYS}-day trial`;

  return { cardPricing, currencySymbol, overageHint, buttonLabel };
}

export function getPricingRegionLabel(resolvedCurrency: string): string {
  return resolvedCurrency === "INR"
    ? "India-competitive pricing"
    : "Premium international pricing";
}

export function getEnterpriseContactMessage(billingCycle: string): string {
  return `Hi Docita Sales Team,

I am interested in the Enterprise plan from onboarding.

Selected tier: Enterprise
Billing preference: ${billingCycle}

Please contact me with deployment and commercial details.`;
}
