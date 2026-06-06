"use client";

import { useMemo, useState } from "react";
import { Feature, type PlanMode } from "@workspace/types";
import {
  FEATURE_TIER_MAP,
  Tier,
  getFeatureComparisonData,
  type FeatureComparisonRow,
} from "@/lib/subscription/tier-access";
import { getFeatureDetails } from "@/features/subscription/config/feature-config";
import {
  COMPARISON_MODES,
  comparisonTiersForMode,
  FEATURE_CATEGORIES,
  KEY_FEATURE_CATEGORIES,
} from "./comparison-table-helpers";

export type AvailableFeatureItem =
  | { kind: "header"; label: string }
  | {
      kind: "feature";
      feature: Feature;
      label: string;
    };

export function useComparisonTable({
  currentTier,
  keyFeaturesOnly,
}: {
  currentTier: number;
  keyFeaturesOnly?: boolean;
}) {
  const [mode, setMode] = useState<PlanMode>("FULL");
  const tiers = useMemo(() => comparisonTiersForMode(mode), [mode]);
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
  const effectiveMobileTier: Tier = tiers.includes(mobileTier)
    ? mobileTier
    : validCurrentTier;
  const compareWithTier: Tier =
    effectiveMobileTier !== validCurrentTier
      ? effectiveMobileTier
      : (tiers.find((t) => t !== validCurrentTier) ?? validCurrentTier);
  const availableFeatures = useMemo(
    () =>
      categories.flatMap<AvailableFeatureItem>((category) => {
        const validFeatures = category.features.filter(
          (f) =>
            f in FEATURE_TIER_MAP && getFeatureDetails(f).isGenerallyAvailable,
        );
        if (validFeatures.length === 0) return [];
        return [
          { kind: "header", label: category.label },
          ...validFeatures.map((feature) => ({
            kind: "feature" as const,
            feature,
            label: getFeatureDetails(feature).name,
          })),
        ];
      }),
    [categories],
  );
  return {
    tiers,
    limitRows,
    categories,
    validCurrentTier,
    compareWithTier,
    setMobileTier,
    availableFeatures,
    currentTier,
    mode,
    setMode,
    modes: COMPARISON_MODES,
  };
}
