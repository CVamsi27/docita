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

  it("returns the fallback when the payload is neither an array nor a { tiers } envelope", () => {
    // Exercises `extractRawTierRows` returning `null` for an unrecognized shape.
    expect(normalizeInternalTierPricingResponse({ unexpected: true }, fallback)).toBe(fallback);
    expect(normalizeInternalTierPricingResponse("not-an-object", fallback)).toBe(fallback);
    expect(normalizeInternalTierPricingResponse(null, fallback)).toBe(fallback);
  });

  it("returns the fallback when the array is empty", () => {
    expect(normalizeInternalTierPricingResponse([], fallback)).toBe(fallback);
  });

  it("maps a loose row that lacks the strict schema's required name/aiEnabled fields", () => {
    // Falls through `isInternalPaymentTierPricingRow` (no billingCycle/maxPatients/features)
    // and the strict `internalTierPricingRowSchema` (missing `name`/`aiEnabled`) into the
    // final loose-schema fallback parse.
    const rows = normalizeInternalTierPricingResponse(
      [{ tier: "STARTER", price: 1999, maxDoctors: 5 }],
      fallback,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      tier: "STARTER",
      price: 1999,
      priceIsCustom: false,
      billingCycle: "monthly",
    });
  });

  it("drops entries that match none of the recognized row shapes", () => {
    const rows = normalizeInternalTierPricingResponse(
      [{ unrelated: "value" }, { tier: "CORE", price: 999, maxDoctors: 20 }],
      fallback,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ tier: "CORE", price: 999 });
  });

  it("returns the fallback when every entry fails to map", () => {
    const rows = normalizeInternalTierPricingResponse(
      [{ unrelated: "value" }, 42, null],
      fallback,
    );

    expect(rows).toBe(fallback);
  });

  it("preserves an explicit priceIsCustom flag on a fully-shaped row instead of recomputing it", () => {
    const fullyShapedRow = {
      tier: "CORE",
      price: 999,
      priceIsCustom: true,
      billingCycle: "monthly",
      maxDoctors: 20,
      maxPatients: 500,
      features: [],
    };

    const rows = normalizeInternalTierPricingResponse([fullyShapedRow], fallback);

    expect(rows).toHaveLength(1);
    // `tierPriceIsCustom("CORE", 999)` would compute `false`, but the row's own
    // explicit `priceIsCustom: true` must win via the `??` short-circuit.
    expect(rows[0]).toMatchObject({ tier: "CORE", priceIsCustom: true });
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

  it("marks ENTERPRISE rows as custom-priced regardless of the price field", () => {
    const row = mapInternalTierPricingApiRow({
      tier: "ENTERPRISE",
      name: "Enterprise",
      price: 50000,
      maxDoctors: 100,
      aiEnabled: true,
    });

    expect(row.priceIsCustom).toBe(true);
    expect(row.billingCycle).toBe("custom");
  });

  it("marks any tier with a null price as custom-priced", () => {
    const row = mapInternalTierPricingApiRow({
      tier: "CORE",
      name: "Core",
      price: null,
      maxDoctors: 10,
      aiEnabled: false,
    });

    expect(row.priceIsCustom).toBe(true);
    expect(row.billingCycle).toBe("custom");
    expect(row.price).toBe(0);
  });

  it("uses monthly billing for a non-enterprise tier with a numeric price", () => {
    const row = mapInternalTierPricingApiRow({
      tier: "CORE",
      name: "Core",
      price: 999,
      maxDoctors: 20,
      aiEnabled: false,
    });

    expect(row.priceIsCustom).toBe(false);
    expect(row.billingCycle).toBe("monthly");
  });

  it("falls back to the unlimited patient cap for an unknown tier with negative maxDoctors", () => {
    const row = mapInternalTierPricingApiRow({
      tier: "CUSTOM_SKU",
      name: "Custom",
      price: 1000,
      maxDoctors: -1,
      aiEnabled: false,
    });

    expect(row.maxPatients).toBe(999_999);
  });

  it("falls back to the default 500-patient cap for an unknown tier with non-negative maxDoctors", () => {
    const row = mapInternalTierPricingApiRow({
      tier: "CUSTOM_SKU",
      name: "Custom",
      price: 1000,
      maxDoctors: 5,
      aiEnabled: false,
    });

    expect(row.maxPatients).toBe(500);
  });

  it("defaults maxDoctors to -1 when omitted", () => {
    const row = mapInternalTierPricingApiRow({
      tier: "CUSTOM_SKU",
      name: "Custom",
      aiEnabled: false,
    });

    expect(row.maxDoctors).toBe(-1);
    expect(row.maxPatients).toBe(999_999);
  });

  it("includes the AI-enabled feature flag when aiEnabled is true", () => {
    const row = mapInternalTierPricingApiRow({
      tier: "CORE",
      name: "Core",
      price: 999,
      maxDoctors: 20,
      aiEnabled: true,
    });

    expect(row.features).toEqual(["AI enabled"]);
  });

  it("returns no feature flags when aiEnabled is false or omitted", () => {
    const row = mapInternalTierPricingApiRow({
      tier: "CORE",
      name: "Core",
      price: 999,
      maxDoctors: 20,
    });

    expect(row.features).toEqual([]);
  });
});
