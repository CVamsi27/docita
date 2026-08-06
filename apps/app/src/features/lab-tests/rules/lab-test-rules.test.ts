import { describe, expect, it } from "vitest";
import {
  formatLabValue,
  getStatusColor,
  getTestResultStatus,
  hasAbnormalResults,
  hasCriticalResults,
  type LabTestResult,
} from "./lab-test-rules";

describe("getTestResultStatus", () => {
  it("returns undefined when no reference range is present", () => {
    expect(
      getTestResultStatus({ testName: "X", value: 5, unit: "mg/dL" }),
    ).toBeUndefined();
  });

  it("classifies in-range values as normal", () => {
    expect(
      getTestResultStatus({
        testName: "Glucose",
        value: 95,
        unit: "mg/dL",
        referenceMin: 70,
        referenceMax: 110,
      }),
    ).toBe("normal");
  });

  it("classifies below-range values as low", () => {
    expect(
      getTestResultStatus({
        testName: "Glucose",
        value: 65,
        unit: "mg/dL",
        referenceMin: 70,
        referenceMax: 110,
      }),
    ).toBe("low");
  });

  it("classifies above-range values as high", () => {
    expect(
      getTestResultStatus({
        testName: "Glucose",
        value: 115,
        unit: "mg/dL",
        referenceMin: 70,
        referenceMax: 110,
      }),
    ).toBe("high");
  });

  it("classifies values beyond 20% outside the range as critical", () => {
    // Range width 40; 20% = 8. Below 62 or above 118 is critical.
    expect(
      getTestResultStatus({
        testName: "Glucose",
        value: 60,
        unit: "mg/dL",
        referenceMin: 70,
        referenceMax: 110,
      }),
    ).toBe("critical");
    expect(
      getTestResultStatus({
        testName: "Glucose",
        value: 125,
        unit: "mg/dL",
        referenceMin: 70,
        referenceMax: 110,
      }),
    ).toBe("critical");
  });
});

describe("formatLabValue", () => {
  it("omits decimals for integers", () => {
    expect(formatLabValue(10, "g/dL")).toBe("10 g/dL");
  });

  it("renders two decimals for non-integers", () => {
    expect(formatLabValue(10.5, "g/dL")).toBe("10.50 g/dL");
  });
});

describe("getStatusColor", () => {
  it("maps every status to a token-based class", () => {
    expect(getStatusColor("normal")).toBe("text-success");
    expect(getStatusColor("low")).toBe("text-info");
    expect(getStatusColor("high")).toBe("text-warning");
    expect(getStatusColor("critical")).toBe("text-destructive");
    expect(getStatusColor(undefined)).toBe("text-muted-foreground");
  });
});

describe("hasAbnormalResults / hasCriticalResults", () => {
  const results: LabTestResult[] = [
    { testName: "A", value: 1, unit: "u", status: "normal" },
    { testName: "B", value: 2, unit: "u", status: "high" },
  ];

  it("detects any abnormal result", () => {
    expect(hasAbnormalResults(results)).toBe(true);
    expect(hasAbnormalResults([results[0]])).toBe(false);
  });

  it("detects critical results only", () => {
    expect(hasCriticalResults(results)).toBe(false);
    expect(
      hasCriticalResults([...results, { testName: "C", value: 3, unit: "u", status: "critical" }]),
    ).toBe(true);
  });
});
