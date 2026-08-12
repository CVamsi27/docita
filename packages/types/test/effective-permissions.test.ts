import { describe, expect, it } from "vitest";
import {
  APP_ACCESS_TARGETS,
  effectivePermissionsResponseSchema,
  TIER_SENTINEL_FEATURES,
  Tier,
} from "../src";

describe("@workspace/types effective-permissions contract", () => {
  it("parses a well-formed snapshot", () => {
    const parsed = effectivePermissionsResponseSchema.parse({
      role: "ADMIN",
      tier: "PROFESSIONAL",
      planMode: "FULL",
      hasIntelligence: false,
      permissions: ["patients:read", "invoices:write"],
      targets: {
        [APP_ACCESS_TARGETS.PAGE_DASHBOARD]: { read: true, write: false },
        [APP_ACCESS_TARGETS.API_PATIENTS]: { read: true, write: true },
      },
      generatedAt: "2026-08-07T00:00:00.000Z",
    });
    expect(parsed.targets[APP_ACCESS_TARGETS.PAGE_DASHBOARD].read).toBe(true);
    expect(parsed.role).toBe("ADMIN");
  });

  it("rejects an unknown target key (strict enum keys)", () => {
    expect(() =>
      effectivePermissionsResponseSchema.parse({
        role: "ADMIN",
        tier: "PROFESSIONAL",
        planMode: "FULL",
        hasIntelligence: false,
        permissions: [],
        targets: { "page.not-a-target": { read: true, write: false } },
        generatedAt: "2026-08-07T00:00:00.000Z",
      }),
    ).toThrow();
  });

  it("rejects a non-role role value", () => {
    expect(() =>
      effectivePermissionsResponseSchema.parse({
        role: "SOMEONE",
        tier: "PROFESSIONAL",
        planMode: "FULL",
        hasIntelligence: false,
        permissions: [],
        targets: {},
        generatedAt: "2026-08-07T00:00:00.000Z",
      }),
    ).toThrow();
  });

  it("TIER_SENTINEL_FEATURES covers the matrix tier ladder (SSOT)", () => {
    expect(TIER_SENTINEL_FEATURES[Tier.STARTER]).toBeDefined();
    expect(TIER_SENTINEL_FEATURES[Tier.ESSENTIAL]).toBeDefined();
    expect(TIER_SENTINEL_FEATURES[Tier.PROFESSIONAL]).toBeDefined();
    expect(TIER_SENTINEL_FEATURES[Tier.HOSPITAL]).toBeDefined();
  });
});
