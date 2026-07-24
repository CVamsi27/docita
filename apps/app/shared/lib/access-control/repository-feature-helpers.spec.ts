import { Feature } from "@workspace/types";
import { isValidFeature, parseFeatureList } from "./repository-feature-helpers";

describe("isValidFeature", () => {
  it("returns true for valid feature", () => {
    expect(isValidFeature(Feature.DIGITAL_PRESCRIPTIONS)).toBe(true);
  });

  it("returns true for another valid feature", () => {
    expect(isValidFeature(Feature.INVOICING)).toBe(true);
  });

  it("returns false for invalid feature", () => {
    expect(isValidFeature("NONEXISTENT_FEATURE")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isValidFeature("")).toBe(false);
  });
});

describe("parseFeatureList", () => {
  it("returns empty array for non-array input", () => {
    expect(parseFeatureList(null)).toEqual([]);
    expect(parseFeatureList(undefined)).toEqual([]);
    expect(parseFeatureList("string")).toEqual([]);
    expect(parseFeatureList(42)).toEqual([]);
  });

  it("filters valid features", () => {
    const result = parseFeatureList([Feature.DIGITAL_PRESCRIPTIONS, Feature.INVOICING]);
    expect(result).toEqual([Feature.DIGITAL_PRESCRIPTIONS, Feature.INVOICING]);
  });

  it("filters out invalid features", () => {
    const result = parseFeatureList([Feature.DIGITAL_PRESCRIPTIONS, "INVALID", Feature.INVOICING]);
    expect(result).toEqual([Feature.DIGITAL_PRESCRIPTIONS, Feature.INVOICING]);
  });

  it("filters out non-string items", () => {
    const result = parseFeatureList([Feature.DIGITAL_PRESCRIPTIONS, 42, null, Feature.INVOICING]);
    expect(result).toEqual([Feature.DIGITAL_PRESCRIPTIONS, Feature.INVOICING]);
  });

  it("returns empty array for empty array", () => {
    expect(parseFeatureList([])).toEqual([]);
  });
});
