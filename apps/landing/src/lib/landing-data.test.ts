import { describe, expect, it, vi } from "vitest";
import {
  FALLBACK_PRICING_CONFIG,
  formatStatValue,
  formatTierPrice,
  PLATFORM_STATS,
} from "./landing-data";

/** Re-imports the module after stubbing PUBLIC_PLATFORM_STATS, since the value is parsed at module load. */
async function loadStatsWith(raw: string | undefined) {
  vi.resetModules();
  if (raw === undefined) {
    vi.stubEnv("PUBLIC_PLATFORM_STATS", "");
  } else {
    vi.stubEnv("PUBLIC_PLATFORM_STATS", raw);
  }
  const mod = await import("./landing-data");
  vi.unstubAllEnvs();
  return mod.PLATFORM_STATS;
}

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
    it("publishes nothing when PUBLIC_PLATFORM_STATS is not provisioned", async () => {
      // The marketing site must never invent an operating count; unprovisioned
      // means the hero drops the claim and the proof strip does not render.
      expect(PLATFORM_STATS).toBeNull();
      await expect(loadStatsWith(undefined)).resolves.toBeNull();
    });

    it("parses provisioned figures without randomizing them", async () => {
      const raw = JSON.stringify({
        clinics: 12,
        doctors: 34,
        patients: 5600,
        prescriptions: 21000,
      });
      const first = await loadStatsWith(raw);
      const second = await loadStatsWith(raw);
      expect(first).toEqual({
        clinics: 12,
        doctors: 34,
        patients: 5600,
        prescriptions: 21000,
      });
      expect(second).toEqual(first);
    });

    it("rejects malformed, partial and non-positive payloads", async () => {
      await expect(loadStatsWith("not json")).resolves.toBeNull();
      await expect(loadStatsWith("{}")).resolves.toBeNull();
      await expect(
        loadStatsWith('{"clinics":1,"doctors":2,"patients":3}'),
      ).resolves.toBeNull();
      await expect(
        loadStatsWith(
          '{"clinics":0,"doctors":2,"patients":3,"prescriptions":4}',
        ),
      ).resolves.toBeNull();
      await expect(loadStatsWith("[]")).resolves.toBeNull();
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
