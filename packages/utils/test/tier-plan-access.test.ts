import { describe, expect, it } from "vitest";
import {
  Feature,
  FEATURE_TIER_MAP,
  FRONT_DESK_BLOCKED_FEATURES,
  type TierName,
} from "@workspace/types";
import {
  getAllFeaturesUpToTier,
  getFeaturesForTier,
  hasFeatureAccess,
  meetsMinimumTier,
} from "../src/billing/tier-rules";
import { Tier } from "@workspace/types";

const PLAN_SKUS = [
  "FREE",
  "STARTER",
  "FRONT_DESK",
  "ESSENTIAL",
  "PROFESSIONAL",
  "HOSPITAL",
  "ENTERPRISE",
] as const satisfies readonly TierName[];

const ALL_MAPPED_FEATURES = Object.keys(FEATURE_TIER_MAP) as Feature[];

describe("tier plan feature access parity", () => {
  it("denies every FRONT_DESK_BLOCKED_FEATURES flag on FRONT_DESK", () => {
    for (const feature of FRONT_DESK_BLOCKED_FEATURES) {
      expect(hasFeatureAccess("FRONT_DESK", feature, false)).toBe(false);
    }
  });

  it("matches hasFeatureAccess with getFeaturesForTier / getAllFeaturesUpToTier for plan SKUs", () => {
    for (const sku of PLAN_SKUS) {
      const expected = ALL_MAPPED_FEATURES.filter((f) =>
        hasFeatureAccess(sku, f, false),
      );
      expect(getFeaturesForTier(sku)).toEqual(expected);
      expect(getAllFeaturesUpToTier(sku)).toEqual(expected);
      expect(getFeaturesForTier(sku)).toEqual(getAllFeaturesUpToTier(sku));
    }
  });

  it("meetsMinimumTier aligns with billed SKUs for PROFESSIONAL floor", () => {
    expect(meetsMinimumTier("STARTER", Tier.PROFESSIONAL, false)).toBe(false);
    expect(meetsMinimumTier("PROFESSIONAL", Tier.PROFESSIONAL, false)).toBe(
      true,
    );
    expect(meetsMinimumTier("HOSPITAL", Tier.ESSENTIAL, false)).toBe(true);
    expect(meetsMinimumTier("FRONT_DESK", Tier.FRONT_DESK, false)).toBe(true);
  });

  it("includes Starter-era GA clinical basics on ESSENTIAL (cumulative access)", () => {
    const starterFeatures = ALL_MAPPED_FEATURES.filter((f) =>
      hasFeatureAccess("STARTER", f, false),
    );
    const essentialFeatures = new Set(
      ALL_MAPPED_FEATURES.filter((f) =>
        hasFeatureAccess("ESSENTIAL", f, false),
      ),
    );
    for (const f of starterFeatures) {
      expect(essentialFeatures.has(f)).toBe(true);
    }
  });
});
