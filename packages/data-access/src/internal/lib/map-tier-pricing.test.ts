import { describe, expect, it } from "vitest";
import {
  mapInternalTierPricingApiRow,
  normalizeInternalTierPricingResponse,
} from "./map-tier-pricing";

const fallback = [
  {
    tier: "CORE",
    price: 999,
    billingCycle: "monthly",
    maxDoctors: 20,
    maxPatients: 500,
    features: [],
  },
];

describe("normalizeInternalTierPricingResponse", () => {
  it("maps a bare API array from /internal/tier-pricing", () => {
    const rows = normalizeInternalTierPricingResponse(
      [
        {
          tier: "ENTERPRISE",
          name: "Enterprise",
          price: null,
          maxDoctors: -1,
          aiEnabled: true,
        },
      ],
      fallback,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      tier: "ENTERPRISE",
      displayName: "Enterprise",
      priceIsCustom: true,
      billingCycle: "custom",
      maxPatients: 999_999,
    });
  });

  it("still accepts legacy { tiers: [...] } test payloads", () => {
    const rows = normalizeInternalTierPricingResponse(
      { tiers: fallback },
      [],
    );
    expect(rows[0]).toMatchObject({
      tier: "CORE",
      price: 999,
      maxDoctors: 20,
      maxPatients: 500,
    });
  });
});

describe("mapInternalTierPricingApiRow", () => {
  it("uses published tier limits when the SKU exists in TIER_LIMITS", () => {
    const row = mapInternalTierPricingApiRow({
      tier: "ESSENTIAL",
      name: "Essential",
      price: 4999,
      maxDoctors: 1,
      aiEnabled: false,
    });

    expect(row.maxPatients).toBe(999_999);
  });
});
