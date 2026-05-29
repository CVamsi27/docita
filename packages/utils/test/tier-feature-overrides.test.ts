import { describe, expect, it } from "vitest";
import {
  applyModeToPricing,
  clinicFeatureOverridesSchema,
  Feature,
  getAvailableModesForTier,
  MODE_BLOCKED_FEATURES,
  OVERRIDABLE_FEATURES,
  PACKAGE_PRESETS,
  type PackagePresetId,
  type PlanMode,
  PLAN_MODES,
  getPackagePresetsForTier,
} from "@workspace/types";
import { hasFeatureAccess } from "../src/billing/tier-rules";

describe("clinicFeatureOverridesSchema", () => {
  it("keeps overrides that target features in OVERRIDABLE_FEATURES", () => {
    const parsed = clinicFeatureOverridesSchema.parse({
      [Feature.WHATSAPP_MESSAGING]: false,
      [Feature.AI_PRESCRIPTION_ASSISTANT]: false,
    });
    expect(parsed[Feature.WHATSAPP_MESSAGING]).toBe(false);
    expect(parsed[Feature.AI_PRESCRIPTION_ASSISTANT]).toBe(false);
  });

  it("strips features that are not overridable", () => {
    const parsed = clinicFeatureOverridesSchema.parse({
      [Feature.DIGITAL_PRESCRIPTIONS]: false,
      [Feature.MEDICINES_LIST]: false,
      [Feature.WHATSAPP_MESSAGING]: false,
    });
    expect(parsed[Feature.DIGITAL_PRESCRIPTIONS]).toBeUndefined();
    expect(parsed[Feature.MEDICINES_LIST]).toBeUndefined();
    expect(parsed[Feature.WHATSAPP_MESSAGING]).toBe(false);
  });

  it("strips unknown keys", () => {
    const parsed = clinicFeatureOverridesSchema.parse({
      NOT_A_FEATURE: true,
    });
    expect(parsed).toEqual({});
  });

  it("returns an empty object for null/empty input", () => {
    expect(clinicFeatureOverridesSchema.parse({})).toEqual({});
  });
});

describe("hasFeatureAccess + overrides", () => {
  it("honors a per-clinic override that disables WhatsApp on Professional", () => {
    const overrides = { [Feature.WHATSAPP_MESSAGING]: false };
    expect(
      hasFeatureAccess(
        "PROFESSIONAL",
        Feature.WHATSAPP_MESSAGING,
        false,
        overrides,
      ),
    ).toBe(false);
  });

  it("still allows non-overridden features when an override is present", () => {
    const overrides = { [Feature.WHATSAPP_MESSAGING]: false };
    expect(
      hasFeatureAccess(
        "PROFESSIONAL",
        Feature.DIGITAL_PRESCRIPTIONS,
        false,
        overrides,
      ),
    ).toBe(true);
    expect(
      hasFeatureAccess(
        "PROFESSIONAL",
        Feature.INVOICING,
        false,
        overrides,
      ),
    ).toBe(true);
  });

  it("ignores overrides aimed at non-overridable features", () => {
    // DIGITAL_PRESCRIPTIONS is not in OVERRIDABLE_FEATURES; even if it leaked
    // into the overrides record, hasFeatureAccess should fall through to the
    // tier check rather than honoring the override.
    const overrides = { [Feature.DIGITAL_PRESCRIPTIONS]: false } as Partial<
      Record<Feature, boolean>
    >;
    expect(
      hasFeatureAccess(
        "PROFESSIONAL",
        Feature.DIGITAL_PRESCRIPTIONS,
        false,
        overrides,
      ),
    ).toBe(true);
  });

  it("default (no overrides) behaves as before", () => {
    expect(hasFeatureAccess("PROFESSIONAL", Feature.WHATSAPP_MESSAGING)).toBe(
      true,
    );
    expect(hasFeatureAccess("STARTER", Feature.WHATSAPP_MESSAGING)).toBe(false);
  });
});

describe("PACKAGE_PRESETS", () => {
  const PRESET_IDS = Object.keys(PACKAGE_PRESETS) as PackagePresetId[];

  it("every preset only references overridable features", () => {
    for (const id of PRESET_IDS) {
      const preset = PACKAGE_PRESETS[id];
      for (const feature of Object.keys(preset.overrides) as Feature[]) {
        expect(OVERRIDABLE_FEATURES.has(feature)).toBe(true);
      }
    }
  });

  it("PROFESSIONAL_CORE blocks WhatsApp + AI but keeps clinical features", () => {
    const preset = PACKAGE_PRESETS.PROFESSIONAL_CORE;
    expect(
      hasFeatureAccess(
        preset.basePlan,
        Feature.WHATSAPP_MESSAGING,
        false,
        preset.overrides,
      ),
    ).toBe(false);
    expect(
      hasFeatureAccess(
        preset.basePlan,
        Feature.AI_PRESCRIPTION_ASSISTANT,
        false,
        preset.overrides,
      ),
    ).toBe(false);
    expect(
      hasFeatureAccess(
        preset.basePlan,
        Feature.DIGITAL_PRESCRIPTIONS,
        false,
        preset.overrides,
      ),
    ).toBe(true);
    expect(
      hasFeatureAccess(
        preset.basePlan,
        Feature.INVOICING,
        false,
        preset.overrides,
      ),
    ).toBe(true);
  });

  it("HOSPITAL_NO_COMMS blocks WhatsApp but keeps clinical + multi-doctor", () => {
    const preset = PACKAGE_PRESETS.HOSPITAL_NO_COMMS;
    expect(
      hasFeatureAccess(
        preset.basePlan,
        Feature.WHATSAPP_MESSAGING,
        false,
        preset.overrides,
      ),
    ).toBe(false);
    expect(
      hasFeatureAccess(
        preset.basePlan,
        Feature.MULTI_DOCTOR,
        false,
        preset.overrides,
      ),
    ).toBe(true);
  });

  it("getPackagePresetsForTier filters by basePlan", () => {
    const pro = getPackagePresetsForTier("PROFESSIONAL");
    const hosp = getPackagePresetsForTier("HOSPITAL");
    const starter = getPackagePresetsForTier("STARTER");
    expect(pro.every((p) => p.basePlan === "PROFESSIONAL")).toBe(true);
    expect(hosp.every((p) => p.basePlan === "HOSPITAL")).toBe(true);
    expect(starter).toEqual([]);
  });

  it("monthlyDiscount covers every supported currency", () => {
    const currencies = [
      "INR",
      "USD",
      "EUR",
      "GBP",
      "AUD",
      "CAD",
      "SGD",
      "AED",
      "ZAR",
    ] as const;
    for (const id of PRESET_IDS) {
      for (const currency of currencies) {
        expect(typeof PACKAGE_PRESETS[id].monthlyDiscount[currency]).toBe(
          "number",
        );
      }
    }
  });
});

describe("PlanMode gating", () => {
  it("FRONT_DESK mode blocks clinical features (prescriptions, EHR, AI)", () => {
    const blocked = MODE_BLOCKED_FEATURES.FRONT_DESK;
    expect(blocked.has(Feature.DIGITAL_PRESCRIPTIONS)).toBe(true);
    expect(blocked.has(Feature.FULL_EHR)).toBe(true);
    expect(blocked.has(Feature.AI_PRESCRIPTION_ASSISTANT)).toBe(true);
  });

  it("CORE mode blocks WhatsApp + AI but leaves clinical workflows alone", () => {
    const blocked = MODE_BLOCKED_FEATURES.CORE;
    expect(blocked.has(Feature.WHATSAPP_MESSAGING)).toBe(true);
    expect(blocked.has(Feature.AI_PRESCRIPTION_ASSISTANT)).toBe(true);
    expect(blocked.has(Feature.DIGITAL_PRESCRIPTIONS)).toBe(false);
    expect(blocked.has(Feature.FULL_EHR)).toBe(false);
  });

  it("FULL mode blocks nothing", () => {
    expect(MODE_BLOCKED_FEATURES.FULL.size).toBe(0);
  });

  it("hasFeatureAccess respects the mode argument", () => {
    // Professional + FRONT_DESK denies prescriptions even though Professional
    // would otherwise unlock them.
    expect(
      hasFeatureAccess(
        "PROFESSIONAL",
        Feature.DIGITAL_PRESCRIPTIONS,
        false,
        {},
        "FRONT_DESK",
      ),
    ).toBe(false);
    // Professional + CORE keeps prescriptions but denies WhatsApp + AI.
    expect(
      hasFeatureAccess(
        "PROFESSIONAL",
        Feature.DIGITAL_PRESCRIPTIONS,
        false,
        {},
        "CORE",
      ),
    ).toBe(true);
    expect(
      hasFeatureAccess(
        "PROFESSIONAL",
        Feature.WHATSAPP_MESSAGING,
        false,
        {},
        "CORE",
      ),
    ).toBe(false);
    expect(
      hasFeatureAccess(
        "PROFESSIONAL",
        Feature.AI_PRESCRIPTION_ASSISTANT,
        true /* hasIntelligence */,
        {},
        "CORE",
      ),
    ).toBe(false);
    // Professional + FULL keeps everything (general-availability permitting).
    expect(
      hasFeatureAccess(
        "PROFESSIONAL",
        Feature.WHATSAPP_MESSAGING,
        false,
        {},
        "FULL",
      ),
    ).toBe(true);
  });

  it("mode block runs before override so toggle cannot be bypassed", () => {
    expect(
      hasFeatureAccess(
        "PROFESSIONAL",
        Feature.WHATSAPP_MESSAGING,
        false,
        { [Feature.WHATSAPP_MESSAGING]: true },
        "CORE",
      ),
    ).toBe(false);
  });

  it("STARTER only supports FULL mode", () => {
    expect(getAvailableModesForTier("STARTER")).toEqual(["FULL"]);
  });

  it("ESSENTIAL+ tiers support all three modes", () => {
    for (const tier of ["ESSENTIAL", "PROFESSIONAL", "HOSPITAL", "ENTERPRISE"] as const) {
      expect(getAvailableModesForTier(tier).sort()).toEqual(
        [...PLAN_MODES].sort(),
      );
    }
  });

  it("applyModeToPricing applies the mode multiplier", () => {
    const base = { monthly: 1000, yearly: 10000 };
    expect(applyModeToPricing(base, "FULL")).toEqual(base);
    expect(applyModeToPricing(base, "FRONT_DESK")).toEqual({
      monthly: 700,
      yearly: 7000,
    });
    expect(applyModeToPricing(base, "CORE")).toEqual({
      monthly: 800,
      yearly: 8000,
    });
  });

  it("applyModeToPricing passes through custom pricing", () => {
    const custom = { monthly: "custom" as const, yearly: "custom" as const };
    for (const mode of PLAN_MODES) {
      expect(applyModeToPricing(custom, mode as PlanMode)).toEqual(custom);
    }
  });
});
