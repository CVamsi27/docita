"use client";

import { useMemo, useState } from "react";
import { Feature } from "@workspace/types";
import {
  FEATURE_TIER_MAP,
  Tier,
  getFeatureComparisonData,
  type FeatureComparisonRow,
} from "@/lib/subscription/tier-access";
import { getFeatureDetails } from "@/features/subscription/config/feature-config";
import {
  FEATURE_CATEGORIES,
  KEY_FEATURE_CATEGORIES,
} from "./comparison-table-helpers";

export const PUBLISHED_TIER_LADDER: Tier[] = [
  Tier.STARTER,
  Tier.FRONT_DESK,
  Tier.ESSENTIAL,
  Tier.PROFESSIONAL,
  Tier.HOSPITAL,
  Tier.ENTERPRISE,
];

export type AvailableFeatureItem =
  | { kind: "header"; label: string }
  | {
      kind: "feature";
      feature: Feature;
      label: string;
      requiredTier: Tier;
    };

export function useComparisonTable({
  currentTier,
  keyFeaturesOnly,
}: {
  currentTier: number;
  keyFeaturesOnly?: boolean;
}) {
  const tiers = PUBLISHED_TIER_LADDER;

  const limitRows = useMemo(
    () =>
      getFeatureComparisonData().filter(
        (r: FeatureComparisonRow) => r.category === "limit",
      ),
    [],
  );

  const categories = keyFeaturesOnly
    ? KEY_FEATURE_CATEGORIES
    : FEATURE_CATEGORIES;

  const validCurrentTier: Tier = tiers.includes(currentTier)
    ? currentTier
    : (tiers[0] ?? Tier.STARTER);

  const [mobileTier, setMobileTier] = useState<Tier>(() =>
    tiers.includes(currentTier) ? currentTier : (tiers[0] ?? Tier.STARTER),
  );

  const compareWithTier: Tier =
    mobileTier !== validCurrentTier
      ? mobileTier
      : (tiers.find((t) => t !== validCurrentTier) ?? validCurrentTier);

  const availableFeatures = useMemo(() => {
    return categories.flatMap<AvailableFeatureItem>((category) => {
      const validFeatures = category.features.filter(
        (f) => f in FEATURE_TIER_MAP && getFeatureDetails(f).isGenerallyAvailable,
      );
      if (validFeatures.length === 0) return [];

      const header: AvailableFeatureItem = {
        kind: "header",
        label: category.label,
      };

      const features: AvailableFeatureItem[] = validFeatures.map((feature) => ({
        kind: "feature",
        feature,
        label: getFeatureDetails(feature).name,
        requiredTier: FEATURE_TIER_MAP[feature],
      }));

      return [header, ...features];
    });
  }, [categories]);

  return {
    tiers,
    limitRows,
    categories,
    validCurrentTier,
    compareWithTier,
    setMobileTier,
    availableFeatures,
    currentTier,
  };
}
