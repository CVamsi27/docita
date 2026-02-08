import { describe, expect, it } from "vitest";
import {
  calculateBMI,
  getBMIStatus,
  isBloodPressureNormal,
  isPulseNormal,
  isTemperatureNormal,
} from "./vitalsRules";

describe("Vitals Business Rules", () => {
  describe("calculateBMI", () => {
    it("should calculate BMI correctly", () => {
      // 70kg, 175cm -> 70 / (1.75 * 1.75) = 22.857... -> 22.9
      expect(calculateBMI(70, 175)).toBe(22.9);
    });

    it("should return null for invalid inputs", () => {
      expect(calculateBMI(0, 175)).toBe(null);
      expect(calculateBMI(70, 0)).toBe(null);
    });
  });

  describe("getBMIStatus", () => {
    it("should return correct status", () => {
      expect(getBMIStatus(18)).toEqual({
        label: "Underweight",
        color: "text-blue-500",
      });
      expect(getBMIStatus(22)).toEqual({
        label: "Normal",
        color: "text-green-500",
      });
      expect(getBMIStatus(27)).toEqual({
        label: "Overweight",
        color: "text-orange-500",
      });
      expect(getBMIStatus(32)).toEqual({
        label: "Obese",
        color: "text-red-500",
      });
    });

    it("should return null for null input", () => {
      expect(getBMIStatus(null)).toBe(null);
    });
  });

  describe("isBloodPressureNormal", () => {
    it("should return true for normal BP", () => {
      expect(isBloodPressureNormal("120/80")).toBe(true);
      expect(isBloodPressureNormal("110/70")).toBe(true);
    });

    it("should return false for abnormal BP", () => {
      expect(isBloodPressureNormal("140/90")).toBe(false); // High
      expect(isBloodPressureNormal("80/50")).toBe(false); // Low
    });

    it("should handle invalid format", () => {
      expect(isBloodPressureNormal("invalid")).toBe(false);
    });
  });

  describe("isPulseNormal", () => {
    it("should return true for normal pulse", () => {
      expect(isPulseNormal(72)).toBe(true);
    });

    it("should return false for abnormal pulse", () => {
      expect(isPulseNormal(50)).toBe(false);
      expect(isPulseNormal(110)).toBe(false);
    });
  });

  describe("isTemperatureNormal", () => {
    it("should return true for normal temp", () => {
      expect(isTemperatureNormal(98.6)).toBe(true);
    });

    it("should return false for abnormal temp", () => {
      expect(isTemperatureNormal(96)).toBe(false);
      expect(isTemperatureNormal(100)).toBe(false);
    });
  });
});
