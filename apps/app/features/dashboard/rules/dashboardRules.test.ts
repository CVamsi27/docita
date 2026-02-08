import { describe, expect, it } from "vitest";
import {
  calculateGrowthRate,
  formatPercentage,
  getTrendDirection,
} from "./dashboardRules";

describe("Dashboard Business Rules", () => {
  describe("calculateGrowthRate", () => {
    it("should calculate positive growth", () => {
      // 100 -> 150 = 50% increase
      expect(calculateGrowthRate(150, 100)).toBe(50);
    });

    it("should calculate negative growth", () => {
      // 100 -> 50 = 50% decrease
      expect(calculateGrowthRate(50, 100)).toBe(-50);
    });

    it("should handle division by zero (previous = 0)", () => {
      expect(calculateGrowthRate(100, 0)).toBe(100);
    });
  });

  describe("getTrendDirection", () => {
    it("should identify up trend", () => {
      expect(getTrendDirection(10, 5)).toBe("up");
    });

    it("should identify down trend", () => {
      expect(getTrendDirection(5, 10)).toBe("down");
    });

    it("should identify stable trend", () => {
      expect(getTrendDirection(10.005, 10)).toBe("stable");
    });
  });

  describe("formatPercentage", () => {
    it("should add + sign for positive", () => {
      expect(formatPercentage(50)).toBe("+50.0%");
    });

    it("should not add + sign for negative", () => {
      expect(formatPercentage(-50)).toBe("-50.0%");
    });
  });
});
