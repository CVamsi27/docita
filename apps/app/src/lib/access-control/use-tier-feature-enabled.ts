import { useMemo } from "react";
import type { Feature } from "@workspace/types";
import { getTierName, hasFeatureAccess } from "@workspace/utils";
import { useTier } from "@/lib/contexts/tier-context";

/**
 * Checks whether the clinic's current tier grants access to the given feature.
 * Returns `true` by default when tier data is loading (optimistic allow).
 */
export function useTierFeatureEnabled(feature: Feature): boolean {
  const { tier, hasIntelligence } = useTier();

  return useMemo(() => {
    if (tier === null) return true; // optimistic allow while loading
    const tierName = getTierName(tier);
    return hasFeatureAccess(tierName, feature, hasIntelligence);
  }, [tier, feature, hasIntelligence]);
}
