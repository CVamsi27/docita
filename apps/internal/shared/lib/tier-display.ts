import type { InternalPaymentTierPricingRow } from "@workspace/data-access/internal";
import {
  mapDbClinicTierStringToTierName,
  PUBLISHED_PLAN_LADDER,
  TIER_INFO,
  TIER_LIMITS,
  TIER_PRICING,
  type TierName,
} from "@workspace/types";
import { tierPriceIsCustom } from "@workspace/utils";

const TIER_COLOR_TO_BADGE_CLASS: Record<string, string> = {
  gray: "tier-capture",
  blue: "tier-core",
  teal: "tier-plus",
  purple: "tier-pro",
  indigo: "tier-pro",
  orange: "tier-enterprise",
  pink: "tier-intelligence",
};

const TIER_CHART_COLOR_BY_NAME: Partial<Record<TierName, string>> = {
  STARTER: "bg-muted",
  FRONT_DESK: "bg-info",
  ESSENTIAL: "bg-success",
  PROFESSIONAL: "bg-primary",
  HOSPITAL: "bg-processing",
  ENTERPRISE: "bg-warning",
};

export function getInternalTierBadgeClass(tier: string): string {
  const normalized = mapDbClinicTierStringToTierName(tier);
  const color = TIER_INFO[normalized]?.color;
  return (color && TIER_COLOR_TO_BADGE_CLASS[color]) ?? "tier-capture";
}

export function getInternalTierChartColorClass(tier: string): string {
  const normalized = mapDbClinicTierStringToTierName(tier);
  return TIER_CHART_COLOR_BY_NAME[normalized] ?? "bg-primary";
}

export function getInternalTierFilterOptions(): { value: TierName; label: string }[] {
  return PUBLISHED_PLAN_LADDER.map((tier) => ({
    value: tier,
    label: TIER_INFO[tier].name,
  }));
}

export function buildDefaultInternalTierPricingRows(): InternalPaymentTierPricingRow[] {
  return PUBLISHED_PLAN_LADDER.map((tier) => {
    const limits = TIER_LIMITS[tier];
    const info = TIER_INFO[tier];
    const monthly = TIER_PRICING[tier].monthly;
    const priceIsCustom = tierPriceIsCustom(
      tier,
      monthly === "custom" ? null : monthly,
    );
    const price =
      typeof monthly === "number" ? monthly : priceIsCustom ? 0 : 0;

    return {
      tier,
      displayName: info.name,
      price,
      priceIsCustom,
      billingCycle: priceIsCustom ? "custom" : "monthly",
      maxDoctors: limits.doctors ?? -1,
      maxPatients: limits.patients ?? 999_999,
      features: [],
    };
  });
}
