import type { InternalPaymentTierPricingRow } from "@workspace/data-access/internal";
import {
  CLINICAL_PLAN_LADDER,
  FRONT_DESK_PLAN_LADDER,
  getPlanTrack,
  mapDbClinicTierStringToTierName,
  type PlanTrack,
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

// Front-desk track stays in the info family but uses opacity grades so admins
// can tell SOLO / CLINIC / HOSPITAL apart in charts at a glance while keeping
// the visual "this is the same track" cue.
const TIER_CHART_COLOR_BY_NAME: Partial<Record<TierName, string>> = {
  STARTER: "bg-muted",
  FRONT_DESK: "bg-info/40",
  FRONT_DESK_CLINIC: "bg-info/70",
  FRONT_DESK_HOSPITAL: "bg-info",
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

export interface InternalTierFilterOption {
  value: TierName;
  label: string;
  track: PlanTrack;
}

export function getInternalTierFilterOptions(): InternalTierFilterOption[] {
  return PUBLISHED_PLAN_LADDER.map((tier) => ({
    value: tier,
    label: TIER_INFO[tier].name,
    track: getPlanTrack(tier),
  }));
}

/** Filter options grouped by plan track, for two-section pickers in admin UI. */
export function getInternalTierFilterOptionGroups(): {
  track: PlanTrack;
  label: string;
  options: InternalTierFilterOption[];
}[] {
  const toOptions = (tiers: readonly TierName[]): InternalTierFilterOption[] =>
    tiers.map((tier) => ({
      value: tier,
      label: TIER_INFO[tier].name,
      track: getPlanTrack(tier),
    }));
  return [
    {
      track: "CLINICAL",
      label: "Clinical",
      options: toOptions(CLINICAL_PLAN_LADDER),
    },
    {
      track: "FRONT_DESK",
      label: "Front Desk Operations",
      options: toOptions(FRONT_DESK_PLAN_LADDER),
    },
  ];
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
