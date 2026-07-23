import { describe, it, expect } from "vitest";
import {
  getInternalTierBadgeClass,
  getInternalTierLabel,
  getInternalTierChartColorClass,
  getInternalTierFilterOptions,
} from "./tier-display";

describe("getInternalTierBadgeClass", () => {
  it("returns tier-capture for STARTER", () => {
    expect(getInternalTierBadgeClass("STARTER")).toBe("tier-capture");
  });

  it("returns a badge class for ESSENTIAL", () => {
    const result = getInternalTierBadgeClass("ESSENTIAL");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns a badge class for PROFESSIONAL", () => {
    const result = getInternalTierBadgeClass("PROFESSIONAL");
    expect(typeof result).toBe("string");
  });

  it("returns a badge class for HOSPITAL", () => {
    const result = getInternalTierBadgeClass("HOSPITAL");
    expect(typeof result).toBe("string");
  });

  it("returns a badge class for ENTERPRISE", () => {
    const result = getInternalTierBadgeClass("ENTERPRISE");
    expect(typeof result).toBe("string");
  });

  it("returns tier-capture for unknown tier", () => {
    expect(getInternalTierBadgeClass("UNKNOWN")).toBe("tier-capture");
  });
});

describe("getInternalTierLabel", () => {
  it("returns a label for STARTER", () => {
    const label = getInternalTierLabel("STARTER");
    expect(typeof label).toBe("string");
    expect(label.length).toBeGreaterThan(0);
  });

  it("returns a label for ESSENTIAL", () => {
    const label = getInternalTierLabel("ESSENTIAL");
    expect(typeof label).toBe("string");
  });

  it("returns a string label for unknown tier", () => {
    const label = getInternalTierLabel("UNKNOWN_TIER");
    expect(typeof label).toBe("string");
    expect(label.length).toBeGreaterThan(0);
  });
});

describe("getInternalTierChartColorClass", () => {
  it("returns bg-muted for STARTER", () => {
    expect(getInternalTierChartColorClass("STARTER")).toBe("bg-muted");
  });

  it("returns bg-success for ESSENTIAL", () => {
    expect(getInternalTierChartColorClass("ESSENTIAL")).toBe("bg-success");
  });

  it("returns bg-primary for PROFESSIONAL", () => {
    expect(getInternalTierChartColorClass("PROFESSIONAL")).toBe("bg-primary");
  });

  it("returns a string class for unknown tier", () => {
    const result = getInternalTierChartColorClass("UNKNOWN");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("getInternalTierFilterOptions", () => {
  it("returns an array of options", () => {
    const options = getInternalTierFilterOptions();
    expect(Array.isArray(options)).toBe(true);
    expect(options.length).toBeGreaterThan(0);
  });

  it("each option has value and label", () => {
    const options = getInternalTierFilterOptions();
    for (const option of options) {
      expect(typeof option.value).toBe("string");
      expect(typeof option.label).toBe("string");
      expect(option.label.length).toBeGreaterThan(0);
    }
  });

  it("includes STARTER tier", () => {
    const options = getInternalTierFilterOptions();
    const starter = options.find((o) => o.value === "STARTER");
    expect(starter).toBeDefined();
  });

  it("includes ENTERPRISE tier", () => {
    const options = getInternalTierFilterOptions();
    const enterprise = options.find((o) => o.value === "ENTERPRISE");
    expect(enterprise).toBeDefined();
  });
});
