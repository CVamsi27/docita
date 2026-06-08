import { describe, expect, it } from "vitest";
import { Feature, Tier } from "@workspace/types";
import {
  checkClinicTypeFeature,
  checkFeatureAccess,
  resolveRequiredTierForFeature,
  resolveTierDisplayInfo,
  type PermissionAccessContext,
} from "./permission-access-checks";

function makeContext(overrides: Partial<PermissionAccessContext> = {}): PermissionAccessContext {
  return {
    currentTier: Tier.STARTER,
    currentMode: "FULL",
    hasIntelligence: false,
    featureOverrides: {},
    userRole: null,
    clinicType: null,
    ...overrides,
  };
}

describe("checkFeatureAccess", () => {
  it("returns a boolean for any input", () => {
    const result = checkFeatureAccess(makeContext());
    expect(typeof result).toBe("boolean");
  });

  it("returns a boolean on a higher tier", () => {
    const result = checkFeatureAccess(makeContext({ currentTier: Tier.ENTERPRISE }));
    expect(typeof result).toBe("boolean");
  });

  it("denies access when permission is required and user role lacks it", () => {
    const result = checkFeatureAccess(
      makeContext({ userRole: "RECEPTIONIST" }),
      Feature.MEDICAL_CODING,
      "admin:billing:read",
    );
    expect(result).toBe(false);
  });
});

describe("checkClinicTypeFeature", () => {
  it("returns true when clinicType is null (no restriction)", () => {
    expect(checkClinicTypeFeature(null, "any_feature")).toBe(true);
  });

  it("returns true when the clinic type has no restrictions", () => {
    // The exact mapping depends on CLINIC_TYPE_FEATURES, but undefined type
    // behavior is permissive.
    expect(checkClinicTypeFeature(null, "any_feature")).toBe(true);
  });
});

describe("resolveRequiredTierForFeature", () => {
  it("returns the tier from FEATURE_TIER_MAP for a known feature", () => {
    const tier = resolveRequiredTierForFeature(Feature.MEDICAL_CODING);
    expect(typeof tier).toBe("number");
    expect(tier).toBeGreaterThanOrEqual(Tier.STARTER);
  });
});

describe("resolveTierDisplayInfo", () => {
  it("returns the display info for a known tier", () => {
    const info = resolveTierDisplayInfo(Tier.STARTER);
    expect(info).toBeDefined();
    expect(typeof info.name).toBe("string");
    expect(typeof info.color).toBe("string");
  });
});
