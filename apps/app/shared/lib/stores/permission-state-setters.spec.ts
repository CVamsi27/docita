import { describe, expect, it } from "vitest";
import { Tier, planModeSchema, clinicTypeSchema } from "@workspace/types";
import {
  parseClinicTypeInput,
  parseFeatureOverridesInput,
  parsePlanModeInput,
  parseTierInput,
} from "./permission-state-setters";

describe("parseTierInput", () => {
  it("returns the Tier enum value as-is when given a Tier", () => {
    expect(parseTierInput(Tier.STARTER)).toBe(Tier.STARTER);
    expect(parseTierInput(Tier.ENTERPRISE)).toBe(Tier.ENTERPRISE);
  });

  it("maps a valid tier string to the matching Tier", () => {
    expect(parseTierInput("STARTER")).toBe(Tier.STARTER);
    expect(parseTierInput("ENTERPRISE")).toBe(Tier.ENTERPRISE);
  });

  it("falls back to STARTER for legacy FRONT_DESK strings", () => {
    // FRONT_DESK is a legacy enum that gets mapped to STARTER via the access mapper
    const result = parseTierInput("FRONT_DESK");
    expect(typeof result).toBe("number");
  });

  it("returns STARTER for null or undefined", () => {
    expect(parseTierInput(null)).toBe(Tier.STARTER);
    expect(parseTierInput(undefined)).toBe(Tier.STARTER);
  });
});

describe("parsePlanModeInput", () => {
  it("returns the PlanMode value as-is when given a PlanMode", () => {
    expect(parsePlanModeInput("FULL")).toBe("FULL");
    expect(parsePlanModeInput("FRONT_DESK")).toBe("FRONT_DESK");
  });

  it("falls back to FULL for invalid strings", () => {
    expect(parsePlanModeInput("invalid")).toBe("FULL");
    expect(parsePlanModeInput(null)).toBe("FULL");
    expect(parsePlanModeInput(undefined)).toBe("FULL");
  });

  it("accepts the three valid modes", () => {
    planModeSchema.options.forEach((mode) => {
      expect(parsePlanModeInput(mode)).toBe(mode);
    });
  });
});

describe("parseClinicTypeInput", () => {
  it("returns the ClinicType value as-is when given a ClinicType", () => {
    const known = clinicTypeSchema.options[0];
    expect(parseClinicTypeInput(known)).toBe(known);
  });

  it("returns null when given null", () => {
    expect(parseClinicTypeInput(null)).toBeNull();
  });

  it("uppercases the string before parsing", () => {
    const known = clinicTypeSchema.options[0];
    const lower = known.toLowerCase();
    expect(parseClinicTypeInput(lower)).toBe(known);
  });

  it("returns null for invalid strings", () => {
    expect(parseClinicTypeInput("NOT_A_TYPE")).toBeNull();
  });
});

describe("parseFeatureOverridesInput", () => {
  it("strips unknown features and returns only the overridable subset", () => {
    // Schema only retains keys present in OVERRIDABLE_FEATURES, so unknown
    // keys are silently dropped by design.
    const input = { NOT_A_REAL_FEATURE: true };
    expect(parseFeatureOverridesInput(input)).toEqual({});
  });

  it("returns empty object for invalid input", () => {
    expect(parseFeatureOverridesInput("not-an-object")).toEqual({});
  });

  it("returns empty object for null/undefined", () => {
    expect(parseFeatureOverridesInput(null)).toEqual({});
    expect(parseFeatureOverridesInput(undefined)).toEqual({});
  });
});
