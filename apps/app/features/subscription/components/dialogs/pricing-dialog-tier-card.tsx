"use client";

import { cn } from "@workspace/ui/lib/utils";
import { type SupportedCurrency, Tier, type TierName } from "@workspace/types";
import { PRICING_DIALOG_TIER_BORDERS, PRICING_DIALOG_TIER_ICONS } from "@/features/subscription/config/pricing-config";
import { resolveTierMovement } from "./pricing-dialog-tier-card-helpers";
import { CurrentTierBadge, TierActionButton, TierCardHeader, TierEstimateBlock, TierFeatureList, TierPriceBlock } from "./pricing-dialog-tier-card-sections";

export function PricingDialogTierCard({
  tierName,
  currentTier,
  isYearly,
  currency,
  tierPricing,
  tierFeatures,
  estimateValue,
  estimateSymbol,
  locale,
  decimalPlaces,
  onSelectTier,
}: {
  tierName: TierName;
  currentTier: Tier;
  isYearly: boolean;
  currency: SupportedCurrency;
  tierPricing: { monthly: number | "custom"; yearly: number | "custom" };
  tierFeatures: string[];
  estimateValue: number | null;
  estimateSymbol: string;
  locale: string;
  decimalPlaces: number;
  onSelectTier: (tier: TierName, cycle: "MONTHLY" | "YEARLY") => void;
}) {
  const Icon = PRICING_DIALOG_TIER_ICONS[tierName];
  const { isCurrentTier, isUpgrade, isDowngrade } = resolveTierMovement(
    tierName,
    currentTier,
  );
  const price = isYearly ? tierPricing.yearly : tierPricing.monthly;
  const isCustomTier = tierName === "ENTERPRISE" || price === "custom";
  return (
    <div
      className={cn(
        "relative flex w-full max-w-[280px] flex-col rounded-[var(--radius)] border-2 p-4",
        "bg-card",
        "transition-colors duration-150",
        PRICING_DIALOG_TIER_BORDERS[tierName],
        isCurrentTier &&
          "ring-2 ring-primary ring-offset-2 ring-offset-background",
      )}
    >
      <CurrentTierBadge isCurrentTier={isCurrentTier} />
      <TierCardHeader tierName={tierName} Icon={Icon} />
      <TierPriceBlock
        isYearly={isYearly}
        currency={currency}
        tierPricing={tierPricing}
        isCustomTier={isCustomTier}
      />
      <TierEstimateBlock
        estimateValue={estimateValue}
        estimateSymbol={estimateSymbol}
        locale={locale}
        decimalPlaces={decimalPlaces}
        isYearly={isYearly}
      />
      <TierFeatureList tierName={tierName} tierFeatures={tierFeatures} />
      <TierActionButton
        tierName={tierName}
        isYearly={isYearly}
        isCurrentTier={isCurrentTier}
        isUpgrade={isUpgrade}
        isDowngrade={isDowngrade}
        onSelectTier={onSelectTier}
      />
    </div>
  );
}

export function resolvePricingDialogEstimate(
  tierName: TierName,
  isYearly: boolean,
  estimate:
    | {
        totalMonthly: number;
        totalYearly: number;
      }
    | null
    | undefined,
): number | null {
  if (tierName === "ENTERPRISE" || !estimate) return null;

  return isYearly ? estimate.totalYearly : estimate.totalMonthly;
}
