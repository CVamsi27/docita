import { describe, expect, it } from "vitest";
import {
  calculateBMI,
  calculateQTc,
  getBMICategory,
} from "./medical-calculations";

describe("Medical Calculations", () => {
  describe("calculateBMI", () => {
    it("should calculate BMI correctly", () => {
      // 70kg, 175cm -> 22.9
      expect(calculateBMI(70, 175)).toBe(22.9);
    });

    it("should throw error for invalid inputs", () => {
      expect(() => calculateBMI(0, 175)).toThrow();
      expect(() => calculateBMI(70, -10)).toThrow();
    });
  });

  describe("calculateQTc", () => {
    it("should calculate QTc using Bazett's formula", () => {
      // QT: 400ms, HR: 75bpm
      // RR = 60/75 = 0.8s
      // QTc = 400 / sqrt(0.8) = 400 / 0.894 = 447.2 -> 447
      expect(calculateQTc(400, 75)).toBe(447);
    });

    it("should throw error for invalid inputs", () => {
      expect(() => calculateQTc(0, 75)).toThrow();
    });
  });

  describe("getBMICategory", () => {
    it("should categorize correctly", () => {
      expect(getBMICategory(15)).toBe("Severe Thinness");
      expect(getBMICategory(17.5)).toBe("Mild Thinness");
      expect(getBMICategory(22)).toBe("Normal weight");
      expect(getBMICategory(27)).toBe("Overweight");
      expect(getBMICategory(32)).toBe("Obese Class I");
    });
  });
});
