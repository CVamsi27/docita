import { describe, expect, it } from "vitest";
import {
  FALLBACK_PRICING_CONFIG,
  formatStatValue,
  formatTierPrice,
  PLATFORM_STATS,
} from "./landing-data";

// fetchPlatformStats tests removed — backend disabled, static stats used.
// Restore by uncommenting the fetchPlatformStats tests and re-enabling
// the fetch function in landing-data.ts.

describe("landing-data", () => {
  describe("formatTierPrice", () => {
    it("renders custom pricing verbatim", () => {
      expect(formatTierPrice("custom", "₹")).toBe("Custom");
    });

    it("prefixes the currency symbol and formats the amount with en-IN grouping", () => {
      expect(formatTierPrice(4999, "₹")).toBe("₹4,999");
    });
  });

  describe("formatStatValue", () => {
    it("formats whole numbers with en-IN grouping", () => {
      expect(formatStatValue(12000)).toBe("12,000");
    });
  });

  describe("PLATFORM_STATS", () => {
    it("has positive values for all stat fields", () => {
      expect(PLATFORM_STATS.clinics).toBeGreaterThan(0);
      expect(PLATFORM_STATS.doctors).toBeGreaterThan(0);
      expect(PLATFORM_STATS.patients).toBeGreaterThan(0);
      expect(PLATFORM_STATS.prescriptions).toBeGreaterThan(0);
    });
  });

  describe("FALLBACK_PRICING_CONFIG", () => {
    it("exposes INR as the default currency with a symbol", () => {
      expect(FALLBACK_PRICING_CONFIG.currency).toEqual({
        code: "INR",
        symbol: "₹",
        name: "Indian Rupee",
      });
    });

    it("lists at least the starter tier with numeric monthly pricing", () => {
      const starter = FALLBACK_PRICING_CONFIG.tiers.find(
        (tier) => tier.id === "STARTER",
      );
      expect(starter).toBeDefined();
      expect(typeof starter!.pricing.monthly).toBe("number");
      expect(starter!.features.length).toBeGreaterThan(0);
    });
  });
});
