"use client";

import { ArrowDown, ArrowRight } from "lucide-react";
import type { TierPricing } from "@/features/subscription/hooks/use-pricing";
import { YearlyVsListAnnualPrice } from "@/features/subscription/lib/yearly-vs-list-annual-price";
import { TIER_ICONS } from "./tier-change-dialog-types";
import type { TierName } from "@workspace/types";
import { TIER_INFO } from "@workspace/types";

interface TierChangeDialogPlanCompareProps {
  currentTierName: TierName;
  selectedTier: TierName;
  billingCycle: "MONTHLY" | "YEARLY";
  isUpgrade: boolean;
  currentTierData: TierPricing | undefined;
  selectedTierData: TierPricing | undefined;
  currentPrice: number | "custom";
  selectedPrice: number | "custom";
  currentHasCustomPricing: boolean;
  selectedHasCustomPricing: boolean;
  formatPrice: (price: number | "custom") => string;
  cycleSuffix: string;
}

export function TierChangeDialogPlanCompare({
  currentTierName,
  selectedTier,
  billingCycle,
  isUpgrade,
  currentTierData,
  selectedTierData,
  currentPrice,
  selectedPrice,
  currentHasCustomPricing,
  selectedHasCustomPricing,
  formatPrice,
  cycleSuffix,
}: TierChangeDialogPlanCompareProps) {
  const currentInfo = TIER_INFO[currentTierName];
  const selectedInfo = TIER_INFO[selectedTier];
  const CurrentIcon = TIER_ICONS[currentTierName];
  const SelectedIcon = TIER_ICONS[selectedTier];

  return (
    <div className="grid gap-3 py-2 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background">
            <CurrentIcon className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium">Current plan</span>
        </div>
        <p className="font-semibold">{currentInfo.name}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {billingCycle === "YEARLY" &&
          !currentHasCustomPricing &&
          currentTierData &&
          typeof currentTierData.pricing.monthly === "number" &&
          typeof currentPrice === "number" ? (
            <YearlyVsListAnnualPrice
              monthlyListPrice={currentTierData.pricing.monthly}
              discountedAnnualPrice={currentPrice}
              formatMoney={formatPrice}
            />
          ) : !currentHasCustomPricing && typeof currentPrice === "number" ? (
            `${formatPrice(currentPrice)}${cycleSuffix}`
          ) : (
            "Custom pricing"
          )}
        </p>
      </div>

      <div className="hidden items-center justify-center sm:flex">
        {isUpgrade ? (
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ArrowDown className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background text-primary">
            <SelectedIcon className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium">Selected plan</span>
        </div>
        <p className="font-semibold">{selectedInfo.name}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {billingCycle === "YEARLY" &&
          !selectedHasCustomPricing &&
          selectedTierData &&
          typeof selectedTierData.pricing.monthly === "number" &&
          typeof selectedPrice === "number" ? (
            <YearlyVsListAnnualPrice
              monthlyListPrice={selectedTierData.pricing.monthly}
              discountedAnnualPrice={selectedPrice}
              formatMoney={formatPrice}
            />
          ) : !selectedHasCustomPricing && typeof selectedPrice === "number" ? (
            `${formatPrice(selectedPrice)}${cycleSuffix}`
          ) : (
            "Custom pricing"
          )}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {billingCycle === "YEARLY" ? "Yearly billing" : "Monthly billing"}
        </p>
      </div>
    </div>
  );
}
