"use client";

import { Button } from "@workspace/ui/components/form/button";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { cn } from "@workspace/ui/lib/utils";
import { Check } from "lucide-react";
import {
  type SupportedCurrency,
  Tier,
  TIER_INFO,
  TIER_LIMITS,
  type TierName,
} from "@workspace/types";
import {
  PRICING_DIALOG_TIER_BORDERS,
  PRICING_DIALOG_TIER_ICONS,
} from "@/features/subscription/config/pricing-config";
import {
  formatAmountLocale,
  formatCountLocale,
  formatPriceWithCurrency,
} from "@workspace/utils";
import { YearlyVsListAnnualPrice } from "@/features/subscription/lib/yearly-vs-list-annual-price";

const TIER_ICON_CLASSES: Record<TierName, string> = {
  STARTER: "tier-capture",
  ESSENTIAL: "tier-core",
  FRONT_DESK: "tier-core",
  PROFESSIONAL: "tier-pro",
  HOSPITAL: "tier-hospital",
  ENTERPRISE: "tier-enterprise",
  INTELLIGENCE: "tier-intelligence",
};

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
  const info = TIER_INFO[tierName];
  const limits = TIER_LIMITS[tierName];
  const Icon = PRICING_DIALOG_TIER_ICONS[tierName];
  const tierNumeric = Tier[tierName];
  const isCurrentTier = tierNumeric === currentTier;
  const isUpgrade = tierNumeric > currentTier;
  const isDowngrade = tierNumeric < currentTier;

  const price = isYearly ? tierPricing.yearly : tierPricing.monthly;
  const isCustomTier = tierName === "ENTERPRISE" || price === "custom";
  const monthlyEquivalent =
    isYearly && typeof price === "number" ? price / 12 : price;

  const formatPrice = (amount: number | "custom") =>
    formatPriceWithCurrency(amount, currency);

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
      {isCurrentTier ? (
        <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground z-10">
          Current
        </Badge>
      ) : null}

      <div className="flex items-center gap-2 mb-3">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/70",
            TIER_ICON_CLASSES[tierName],
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold">{info.name}</h3>
          <p className="text-xs text-muted-foreground">{info.tagline}</p>
        </div>
      </div>

      <div key={isYearly ? "yearly" : "monthly"} className="mb-4">
        {isCustomTier ? (
          <div className="text-[var(--fs-2xl)] font-semibold leading-[var(--lh-tight)]">
            Custom
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-1">
              <span className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                {formatPrice(
                  typeof monthlyEquivalent === "number" ? monthlyEquivalent : 0,
                )}
              </span>
              <span className="text-sm text-muted-foreground">/mo</span>
            </div>
            {isYearly &&
            typeof tierPricing.monthly === "number" &&
            typeof tierPricing.yearly === "number" ? (
              <p className="mt-1 text-xs text-muted-foreground">
                <YearlyVsListAnnualPrice
                  monthlyListPrice={tierPricing.monthly}
                  discountedAnnualPrice={tierPricing.yearly}
                  formatMoney={formatPrice}
                />
              </p>
            ) : null}
          </>
        )}
      </div>

      {estimateValue !== null ? (
        <div className="mb-3 rounded-md border border-primary/20 bg-primary/5 px-2 py-1.5">
          <p className="text-[var(--fs-2xs)] text-muted-foreground">
            Est. with your usage
          </p>
          <p className="text-sm font-semibold text-foreground">
            {estimateSymbol}
            {formatAmountLocale(estimateValue, locale, {
              minimumFractionDigits: decimalPlaces,
              maximumFractionDigits: decimalPlaces,
            })}
            {isYearly ? "/yr" : "/mo"}
          </p>
        </div>
      ) : null}

      <div className="space-y-2 mb-4 flex-1">
        <div className="flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-success" />
          <span>
            {limits.patients === 999999
              ? "Unlimited"
              : formatCountLocale(limits.patients)}{" "}
            patients
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-success" />
          <span>
            {limits.doctors === 999 ? "Unlimited" : limits.doctors} doctor
            {limits.doctors !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-success" />
          <span>{limits.storageGB} GB storage</span>
        </div>
        {limits.appointments ? (
          <div className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-success" />
            <span>
              {limits.appointments === 999999
                ? "Unlimited"
                : formatCountLocale(limits.appointments)}{" "}
              consultations/mo
            </span>
          </div>
        ) : null}

        {tierFeatures.length > 0 ? (
          <div className="pt-2">
            <p className="mb-1 text-[var(--fs-2xs)] font-medium uppercase tracking-wide text-muted-foreground">
              Highlights
            </p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {tierFeatures.map((feature) => (
                <li key={`${tierName}-${feature}`} className="truncate">
                  • {feature}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <Button
        className={cn(
          "w-full mt-auto",
          isCurrentTier && "bg-muted text-muted-foreground",
          isUpgrade && "shadow-sm",
          isDowngrade && "bg-muted/50 hover:bg-muted",
        )}
        variant={isDowngrade ? "outline" : "default"}
        disabled={isCurrentTier}
        onClick={() => onSelectTier(tierName, isYearly ? "YEARLY" : "MONTHLY")}
      >
        {isCurrentTier
          ? "Current Plan"
          : isUpgrade
            ? "Upgrade"
            : "Downgrade"}
      </Button>
    </div>
  );
}

export function resolvePricingDialogEstimate(
  tierName: TierName,
  isYearly: boolean,
  estimate: {
    totalMonthly: number;
    totalYearly: number;
  } | null | undefined,
): number | null {
  if (tierName === "ENTERPRISE" || !estimate) {
    return null;
  }

  return isYearly ? estimate.totalYearly : estimate.totalMonthly;
}
