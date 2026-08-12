import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FALLBACK_PRICING_CONFIG,
  formatStatValue,
  formatTierPrice,
} from "./landing-data";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// `fetchPlatformStats` keeps a module-level 24h cache, so each test needs a
// fresh module instance to observe a real fetch instead of the previous
// test's cached entry.
async function importFetchPlatformStats() {
  vi.resetModules();
  const mod = await import("./landing-data");
  return mod.fetchPlatformStats;
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

  describe("fetchPlatformStats", () => {
    it("returns null when live landing data is disabled", async () => {
      vi.stubEnv("PUBLIC_ENABLE_LIVE_LANDING_DATA", "false");
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      const fetchPlatformStats = await importFetchPlatformStats();

      await expect(fetchPlatformStats("https://landing.docita.work")).resolves.toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("fetches, floors, and returns parsed stats", async () => {
      vi.stubEnv("PUBLIC_ENABLE_LIVE_LANDING_DATA", "true");
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              clinics: 1200.7,
              doctors: 3400,
              patients: 55000.2,
              prescriptions: 100000,
            }),
            { status: 200 },
          ),
        ),
      );
      const fetchPlatformStats = await importFetchPlatformStats();

      await expect(fetchPlatformStats("https://landing.docita.work")).resolves.toEqual({
        clinics: 1200,
        doctors: 3400,
        patients: 55000,
        prescriptions: 100000,
      });
    });

    it("returns null and does not throw when the fetch fails", async () => {
      vi.stubEnv("PUBLIC_ENABLE_LIVE_LANDING_DATA", "true");
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(new Response("boom", { status: 503 })),
      );
      const fetchPlatformStats = await importFetchPlatformStats();

      await expect(fetchPlatformStats("https://landing.docita.work")).resolves.toBeNull();
    });

    it("returns null for non-numeric or negative stat values", async () => {
      vi.stubEnv("PUBLIC_ENABLE_LIVE_LANDING_DATA", "true");
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              clinics: "many",
              doctors: -5,
              patients: 100,
              prescriptions: 200,
            }),
            { status: 200 },
          ),
        ),
      );
      const fetchPlatformStats = await importFetchPlatformStats();

      await expect(fetchPlatformStats("https://landing.docita.work")).resolves.toBeNull();
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
