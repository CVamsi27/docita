import { describe, expect, it } from "vitest";
import {
  calculateBMI,
  getBMICategory,
} from "./medical/medical-calculations.js";

describe("Medical Calculations", () => {
  describe("calculateBMI", () => {
    it("should calculate BMI correctly", () => {

      expect(calculateBMI(70, 175)).toBe(22.9);
    });

    it("should throw error for invalid inputs", () => {
      expect(() => calculateBMI(0, 175)).toThrow();
      expect(() => calculateBMI(70, -10)).toThrow();
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
