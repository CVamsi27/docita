import { describe, expect, it } from "vitest";
import {
  calculateBMI,
  getBMIStatus,
  isBloodPressureNormal,
  isPulseNormal,
  isTemperatureNormal,
} from "./vitals-rules";

describe("Vitals Business Rules", () => {
  describe("calculateBMI", () => {
    it("should calculate BMI correctly", () => {

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
        color: "text-info",
      });
      expect(getBMIStatus(22)).toEqual({
        label: "Normal",
        color: "text-success",
      });
      expect(getBMIStatus(27)).toEqual({
        label: "Overweight",
        color: "text-warning",
      });
      expect(getBMIStatus(32)).toEqual({
        label: "Obese",
        color: "text-destructive",
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
      expect(isBloodPressureNormal("140/90")).toBe(false); 
      expect(isBloodPressureNormal("80/50")).toBe(false); 
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
