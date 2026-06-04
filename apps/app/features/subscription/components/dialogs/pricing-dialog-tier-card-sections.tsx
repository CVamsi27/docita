"use client";

import { Button } from "@workspace/ui/components/form/button";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { cn } from "@workspace/ui/lib/utils";
import { Check, type LucideIcon } from "lucide-react";
import {
  type SupportedCurrency,
  type TierName,
  TIER_INFO,
  TIER_LIMITS,
} from "@workspace/types";
import {
  formatAmountLocale,
  formatCountLocale,
  formatPriceWithCurrency,
} from "@workspace/utils";
import { YearlyVsListAnnualPrice } from "@/features/subscription/lib/yearly-vs-list-annual-price";
import { TIER_ICON_CLASSES } from "./pricing-dialog-tier-card-helpers";

export function CurrentTierBadge({
  isCurrentTier,
}: {
  isCurrentTier: boolean;
}) {
  return isCurrentTier ? (
    <Badge className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 bg-primary text-primary-foreground">
      Current
    </Badge>
  ) : null;
}

export function TierCardHeader({
  tierName,
  Icon,
}: {
  tierName: TierName;
  Icon: LucideIcon;
}) {
  const info = TIER_INFO[tierName];
  return (
    <div className="mb-3 flex items-center gap-2">
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
  );
}

export function TierPriceBlock({
  isYearly,
  currency,
  tierPricing,
  isCustomTier,
}: {
  isYearly: boolean;
  currency: SupportedCurrency;
  tierPricing: { monthly: number | "custom"; yearly: number | "custom" };
  isCustomTier: boolean;
}) {
  const price = isYearly ? tierPricing.yearly : tierPricing.monthly;
  const monthlyEquivalent =
    isYearly && typeof price === "number" ? price / 12 : price;
  const formatPrice = (amount: number | "custom") =>
    formatPriceWithCurrency(amount, currency);
  return (
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
          <YearlySavingsLine
            isYearly={isYearly}
            tierPricing={tierPricing}
            formatPrice={formatPrice}
          />
        </>
      )}
    </div>
  );
}

export function TierEstimateBlock({
  estimateValue,
  estimateSymbol,
  locale,
  decimalPlaces,
  isYearly,
}: {
  estimateValue: number | null;
  estimateSymbol: string;
  locale: string;
  decimalPlaces: number;
  isYearly: boolean;
}) {
  return estimateValue !== null ? (
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
  ) : null;
}

export function TierFeatureList({
  tierName,
  tierFeatures,
}: {
  tierName: TierName;
  tierFeatures: string[];
}) {
  const limits = TIER_LIMITS[tierName];
  return (
    <div className="mb-4 flex-1 space-y-2">
      <TierLimitRow label={`${formatPatientLimit(limits.patients)} patients`} />
      <TierLimitRow
        label={`${formatDoctorLimit(limits.doctors)} doctor${limits.doctors !== 1 ? "s" : ""}`}
      />
      <TierLimitRow label={`${limits.storageGB} GB storage`} />
      {limits.appointments ? (
        <TierLimitRow
          label={`${formatPatientLimit(limits.appointments)} consultations/mo`}
        />
      ) : null}
      <TierHighlights tierName={tierName} tierFeatures={tierFeatures} />
    </div>
  );
}

export function TierActionButton({
  tierName,
  isYearly,
  isCurrentTier,
  isUpgrade,
  isDowngrade,
  onSelectTier,
}: {
  tierName: TierName;
  isYearly: boolean;
  isCurrentTier: boolean;
  isUpgrade: boolean;
  isDowngrade: boolean;
  onSelectTier: (tier: TierName, cycle: "MONTHLY" | "YEARLY") => void;
}) {
  return (
    <Button
      className={cn(
        "mt-auto w-full",
        isCurrentTier && "bg-muted text-muted-foreground",
        isUpgrade && "shadow-sm",
        isDowngrade && "bg-muted/50 hover:bg-muted",
      )}
      variant={isDowngrade ? "outline" : "default"}
      disabled={isCurrentTier}
      onClick={() => onSelectTier(tierName, isYearly ? "YEARLY" : "MONTHLY")}
    >
      {isCurrentTier ? "Current Plan" : isUpgrade ? "Upgrade" : "Downgrade"}
    </Button>
  );
}

function YearlySavingsLine({
  isYearly,
  tierPricing,
  formatPrice,
}: {
  isYearly: boolean;
  tierPricing: { monthly: number | "custom"; yearly: number | "custom" };
  formatPrice: (amount: number | "custom") => string;
}) {
  return isYearly &&
    typeof tierPricing.monthly === "number" &&
    typeof tierPricing.yearly === "number" ? (
    <p className="mt-1 text-xs text-muted-foreground">
      <YearlyVsListAnnualPrice
        monthlyListPrice={tierPricing.monthly}
        discountedAnnualPrice={tierPricing.yearly}
        formatMoney={formatPrice}
      />
    </p>
  ) : null;
}

function TierLimitRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Check className="h-4 w-4 text-success" />
      <span>{label}</span>
    </div>
  );
}

function TierHighlights({
  tierName,
  tierFeatures,
}: {
  tierName: TierName;
  tierFeatures: string[];
}) {
  return tierFeatures.length > 0 ? (
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
  ) : null;
}

function formatPatientLimit(value: number): string {
  return value === 999999 ? "Unlimited" : formatCountLocale(value);
}

function formatDoctorLimit(value: number): string {
  return value === 999 ? "Unlimited" : String(value);
}
