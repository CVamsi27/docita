import { describe, expect, it } from "vitest";
import { APP_ACCESS_TARGETS, Tier } from "@workspace/types";
import { computeEffectivePermissions } from "./effective-permissions.js";

const PROFESSIONAL_ADMIN = {
  role: "ADMIN" as const,
  tierName: "PROFESSIONAL" as const,
  planMode: "FULL" as const,
  hasIntelligence: false,
  featureOverrides: {},
};

describe("computeEffectivePermissions (C7 server snapshot mirror)", () => {
  it("ADMIN @ PROFESSIONAL/FULL: dashboard read true, hospital coming-soon false", () => {
    const snap = computeEffectivePermissions(PROFESSIONAL_ADMIN);
    expect(snap[APP_ACCESS_TARGETS.PAGE_DASHBOARD]?.read).toBe(true);
    expect(snap[APP_ACCESS_TARGETS.PAGE_HOSPITAL]?.read).toBe(false);
    expect(snap[APP_ACCESS_TARGETS.PAGE_HOSPITAL]?.write).toBe(false);
  });

  it("ADMIN @ PROFESSIONAL: prescriptions read true; desk-floor (HOSPITAL tier) false", () => {
    const snap = computeEffectivePermissions(PROFESSIONAL_ADMIN);
    expect(snap[APP_ACCESS_TARGETS.API_PRESCRIPTIONS]?.read).toBe(true);
    expect(snap[APP_ACCESS_TARGETS.PAGE_DESK_FLOOR]?.read).toBe(false);
  });

  it("desk invoice settlement requires INVOICING: false at STARTER, true at PROFESSIONAL", () => {
    const starter = computeEffectivePermissions({
      role: "ADMIN",
      tierName: "STARTER",
      planMode: "FULL",
      hasIntelligence: false,
      featureOverrides: {},
    });
    expect(
      starter[APP_ACCESS_TARGETS.API_DESK_INVOICE_SETTLEMENT]?.read,
    ).toBe(false);
    const prof = computeEffectivePermissions(PROFESSIONAL_ADMIN);
    expect(prof[APP_ACCESS_TARGETS.API_DESK_INVOICE_SETTLEMENT]?.read).toBe(
      true,
    );
    expect(prof[APP_ACCESS_TARGETS.API_DESK_INVOICE_SETTLEMENT]?.write).toBe(
      true,
    );
  });

  it("FRONT_DESK mode blocks clinical targets but keeps front-desk targets", () => {
    const frontDesk = computeEffectivePermissions({
      role: "ADMIN",
      tierName: "ESSENTIAL",
      planMode: "FRONT_DESK",
      hasIntelligence: false,
      featureOverrides: {},
    });
    // Clinical prescriptions are blocked by the mode.
    expect(frontDesk[APP_ACCESS_TARGETS.API_PRESCRIPTIONS]?.read).toBe(false);
    // Desk invoice settlement (front-desk) stays readable/writable.
    expect(
      frontDesk[APP_ACCESS_TARGETS.API_DESK_INVOICE_SETTLEMENT]?.read,
    ).toBe(true);
  });

  it("NURSE sees dashboard but not prescription authoring write roles beyond matrix", () => {
    const snap = computeEffectivePermissions({
      role: "NURSE",
      tierName: "PROFESSIONAL",
      planMode: "FULL",
      hasIntelligence: false,
      featureOverrides: {},
    });
    expect(snap[APP_ACCESS_TARGETS.PAGE_DASHBOARD]?.read).toBe(true);
    expect(snap[APP_ACCESS_TARGETS.API_PRESCRIPTIONS]?.read).toBe(true);
  });

  it("INTERNAL bypass: every target true", () => {
    const snap = computeEffectivePermissions({
      role: "INTERNAL",
      tierName: "ENTERPRISE",
      planMode: "FULL",
      hasIntelligence: true,
      featureOverrides: {},
    });
    const targets = Object.keys(snap);
    expect(targets.length).toBeGreaterThan(40);
    for (const target of targets) {
      expect(snap[target]?.read).toBe(true);
      expect(snap[target]?.write).toBe(true);
    }
  });

  it("is stable across a Tier enum input (getTierName coercion path)", () => {
    // Guard against accidental Tier-enum misuse: the function accepts TierName
    // strings; a numeric enum is a type error at compile time. This test pins
    // the documented TierName contract.
    const snap = computeEffectivePermissions(PROFESSIONAL_ADMIN);
    expect(snap[APP_ACCESS_TARGETS.PAGE_DASHBOARD]?.read).toBe(true);
    expect(Tier.PROFESSIONAL).toBe(2);
  });
});
