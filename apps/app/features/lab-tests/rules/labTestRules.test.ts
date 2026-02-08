import { describe, expect, it } from "vitest";
import {
  getTestResultStatus,
  hasAbnormalResults,
  hasCriticalResults,
  type LabTestResult,
} from "./labTestRules";

describe("Lab Test Rules", () => {
  describe("getTestResultStatus", () => {
    it("should return undefined if ranges are missing", () => {
      const result = { value: 10 } as LabTestResult;
      expect(getTestResultStatus(result)).toBeUndefined();
    });

    it("should identify normal results", () => {
      const result: LabTestResult = {
        testName: "Test",
        value: 10,
        unit: "mg/dL",
        referenceMin: 5,
        referenceMax: 15,
      };
      expect(getTestResultStatus(result)).toBe("normal");
    });

    it("should identify low results", () => {
      // Range 5-15. Critical Low < 3 (5 - 2). Value 4 is Low.
      const result: LabTestResult = {
        testName: "Test",
        value: 4,
        unit: "mg/dL",
        referenceMin: 5,
        referenceMax: 15,
      };
      expect(getTestResultStatus(result)).toBe("low");
    });

    it("should identify high results", () => {
      // Range 5-15. Critical High > 17 (15 + 2). Value 16 is High.
      const result: LabTestResult = {
        testName: "Test",
        value: 16,
        unit: "mg/dL",
        referenceMin: 5,
        referenceMax: 15,
      };
      expect(getTestResultStatus(result)).toBe("high");
    });

    it("should identify critical low results", () => {
      // Range 5-15. Critical Low threshold: 5 - (10 * 0.2) = 3.
      const result: LabTestResult = {
        testName: "Test",
        value: 2,
        unit: "mg/dL",
        referenceMin: 5,
        referenceMax: 15,
      };
      expect(getTestResultStatus(result)).toBe("critical");
    });

    it("should identify critical high results", () => {
      // Range 5-15. Critical High threshold: 15 + (10 * 0.2) = 17.
      const result: LabTestResult = {
        testName: "Test",
        value: 18,
        unit: "mg/dL",
        referenceMin: 5,
        referenceMax: 15,
      };
      expect(getTestResultStatus(result)).toBe("critical");
    });
  });

  describe("hasAbnormalResults", () => {
    it("should return true if any result is abnormal", () => {
      const results: LabTestResult[] = [
        { status: "normal" } as LabTestResult,
        { status: "high" } as LabTestResult,
      ];
      expect(hasAbnormalResults(results)).toBe(true);
    });

    it("should return false if all results are normal", () => {
      const results: LabTestResult[] = [
        { status: "normal" } as LabTestResult,
        { status: "normal" } as LabTestResult,
      ];
      expect(hasAbnormalResults(results)).toBe(false);
    });
  });

  describe("hasCriticalResults", () => {
    it("should return true if any result is critical", () => {
      const results: LabTestResult[] = [
        { status: "high" } as LabTestResult,
        { status: "critical" } as LabTestResult,
      ];
      expect(hasCriticalResults(results)).toBe(true);
    });

    it("should return false if no results are critical", () => {
      const results: LabTestResult[] = [
        { status: "high" } as LabTestResult,
        { status: "low" } as LabTestResult,
      ];
      expect(hasCriticalResults(results)).toBe(false);
    });
  });
});
