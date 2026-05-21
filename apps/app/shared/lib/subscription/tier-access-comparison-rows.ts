import {
  Feature,
  Tier,
  TIER_LIMITS,
  WHATSAPP_ADDON_PRICING,
} from "@workspace/types";
import {
  formatCountLocale,
  getTierName,
  hasFeatureAccess,
} from "@workspace/utils";

const PLAN_LIMITS = TIER_LIMITS;

export interface FeatureComparisonRow {
  name: string;
  category: "limit" | "feature";
  values: Record<Tier, string | boolean | number>;
}

function formatLimitValue(value?: number): string {
  if (value === undefined) return "—";
  if (value >= 999999 || value === 999) return "Unlimited";
  return formatCountLocale(value);
}

function limitsForTier(tier: Tier) {
  return PLAN_LIMITS[getTierName(tier)];
}

function tierRecord<V extends string | boolean | number>(
  build: (tier: Tier) => V,
): Record<Tier, V> {
  return {
    [Tier.STARTER]: build(Tier.STARTER),
    [Tier.FRONT_DESK]: build(Tier.FRONT_DESK),
    [Tier.ESSENTIAL]: build(Tier.ESSENTIAL),
    [Tier.PROFESSIONAL]: build(Tier.PROFESSIONAL),
    [Tier.HOSPITAL]: build(Tier.HOSPITAL),
    [Tier.ENTERPRISE]: build(Tier.ENTERPRISE),
    [Tier.INTELLIGENCE]: build(Tier.INTELLIGENCE),
  };
}

function whatsappIncludedQuota(tier: Tier): number | undefined {
  if (tier === Tier.STARTER) return undefined;
  const tierName = getTierName(tier);
  if (tierName === "STARTER" || tierName === "INTELLIGENCE") {
    return undefined;
  }
  return WHATSAPP_ADDON_PRICING[tierName].includedQuota;
}

export function getFeatureComparisonData(): FeatureComparisonRow[] {
  return [
    {
      name: "Patient Limit",
      category: "limit",
      values: tierRecord((tier) =>
        formatLimitValue(limitsForTier(tier).patients),
      ),
    },
    {
      name: "Doctors",
      category: "limit",
      values: tierRecord((tier) =>
        formatLimitValue(limitsForTier(tier).doctors),
      ),
    },
    {
      name: "Storage",
      category: "limit",
      values: tierRecord(
        (tier) => `${limitsForTier(tier).storageGB} GB`,
      ),
    },
    {
      name: "Branches",
      category: "limit",
      values: tierRecord((tier) =>
        formatLimitValue(limitsForTier(tier).branches),
      ),
    },
    {
      name: "Consultations",
      category: "limit",
      values: tierRecord((tier) =>
        formatLimitValue(limitsForTier(tier).appointments),
      ),
    },
    {
      name: "Prescriptions",
      category: "limit",
      values: tierRecord((tier) =>
        formatLimitValue(limitsForTier(tier).prescriptions),
      ),
    },
    {
      name: "Invoices",
      category: "limit",
      values: tierRecord((tier) =>
        formatLimitValue(limitsForTier(tier).invoices),
      ),
    },
    {
      name: "WhatsApp messages (incl. / mo)",
      category: "limit",
      values: tierRecord((tier) => {
        const quota = whatsappIncludedQuota(tier);
        if (quota === undefined) return "—";
        return formatLimitValue(quota);
      }),
    },
    {
      name: "Prescriptions",
      category: "feature",
      values: tierRecord((tier) =>
        hasFeatureAccess(getTierName(tier), Feature.DIGITAL_PRESCRIPTIONS),
      ),
    },
    {
      name: "Appointments",
      category: "feature",
      values: tierRecord((tier) =>
        hasFeatureAccess(getTierName(tier), Feature.CALENDAR_SLOTS),
      ),
    },
    {
      name: "OCR Scanning",
      category: "feature",
      values: tierRecord((tier) => {
        const name = getTierName(tier);
        if (hasFeatureAccess(name, Feature.OCR_ADVANCED)) return "Advanced";
        if (hasFeatureAccess(name, Feature.OCR_BASIC)) return "Basic";
        return false;
      }),
    },
    {
      name: "Analytics",
      category: "feature",
      values: tierRecord((tier) => {
        const name = getTierName(tier);
        if (hasFeatureAccess(name, Feature.ADVANCED_ANALYTICS))
          return "Advanced";
        if (hasFeatureAccess(name, Feature.BASIC_ANALYTICS)) return "Basic";
        return false;
      }),
    },
    {
      name: "API Access",
      category: "feature",
      values: tierRecord((tier) =>
        hasFeatureAccess(getTierName(tier), Feature.API_ACCESS),
      ),
    },
    {
      name: "Multi-branch",
      category: "feature",
      values: tierRecord((tier) =>
        hasFeatureAccess(getTierName(tier), Feature.MULTI_CLINIC),
      ),
    },
    {
      name: "Inventory",
      category: "feature",
      values: tierRecord((tier) =>
        hasFeatureAccess(getTierName(tier), Feature.INVENTORY),
      ),
    },
    {
      name: "Lab Tests",
      category: "feature",
      values: tierRecord((tier) =>
        hasFeatureAccess(getTierName(tier), Feature.LAB_TESTS),
      ),
    },
    {
      name: "Queue Management",
      category: "feature",
      values: tierRecord((tier) =>
        hasFeatureAccess(getTierName(tier), Feature.QUEUE_MANAGEMENT),
      ),
    },
  ];
}
