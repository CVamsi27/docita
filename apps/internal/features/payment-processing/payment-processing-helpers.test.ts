import { describe, expect, it } from "vitest";
import {
  buildAdditionalChargeRequestPayload,
  buildPaymentRequestPayload,
  buildPricingOfferPayload,
  derivePaymentPageStatus,
  extractAdditionalChargeError,
  guidedSetupPresetAmount,
  mapClinicsForPayment,
  mapPricingDataToTierPricing,
  type PaymentClinic,
  validatePricingOfferParams,
} from "./payment-processing-helpers";

describe("guidedSetupPresetAmount", () => {
  it("returns the list-price string for a supported currency", () => {
    expect(guidedSetupPresetAmount("INR")).not.toBe("");
    expect(guidedSetupPresetAmount("inr")).toBe(guidedSetupPresetAmount("INR"));
  });

  it("returns an empty string for an unsupported currency", () => {
    expect(guidedSetupPresetAmount("XYZ")).toBe("");
  });
});

describe("mapClinicsForPayment", () => {
  it("maps db rows to payment clinics, defaulting nullish fields", () => {
    const [clinic] = mapClinicsForPayment([
      { id: "c1", name: "A", tier: "PRO", email: null, phone: null },
    ]);
    expect(clinic.id).toBe("c1");
    expect(clinic.email).toBe("");
    expect(clinic.phone).toBe("");
    expect(clinic.tier).toBeTruthy();
  });

  it("defaults a missing tier to the STARTER mapping", () => {
    const [clinic] = mapClinicsForPayment([
      { id: "c2", name: "B", tier: null },
    ]);
    expect(clinic.tier).toBeTruthy();
  });
});

describe("mapPricingDataToTierPricing", () => {
  it("maps monthly pricing rows and defaults a missing price to 0", () => {
    const rows = mapPricingDataToTierPricing({
      tiers: [
        { id: "PRO", pricing: { monthly: 1999 } },
        { id: "STARTER", pricing: {} },
      ],
    });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ tier: "PRO", price: 1999, billingCycle: "monthly" });
    expect(rows[1].price).toBe(0);
  });

  it("returns an empty array when tiers is absent", () => {
    expect(mapPricingDataToTierPricing({})).toEqual([]);
  });
});

describe("buildPaymentRequestPayload", () => {
  it("parses the amount and carries the clinic currency", () => {
    const clinic = { currency: "INR" } as PaymentClinic;
    const payload = buildPaymentRequestPayload(clinic, {
      paymentMethod: "razorpay",
      amount: "499.50",
      newTier: "PRO",
      paymentNotes: "note",
    });
    expect(payload.amount).toBe(499.5);
    expect(payload.currency).toBe("INR");
    expect(payload.newTier).toBe("PRO");
    expect(payload.paymentId).toMatch(/^PAY_/);
  });

  it("falls back to the default currency when clinic is null", () => {
    const payload = buildPaymentRequestPayload(null, {
      paymentMethod: "razorpay",
      amount: "100",
      newTier: "PRO",
    });
    expect(payload.currency).toBeTruthy();
  });
});

describe("buildPricingOfferPayload", () => {
  it("trims strings and parses percentOff", () => {
    const payload = buildPricingOfferPayload({
      clinicId: "c1",
      percentOff: "15",
      title: "  Deal  ",
      validUntil: "  ",
      notes: "  hi  ",
    });
    expect(payload.percentOff).toBe(15);
    expect(payload.title).toBe("Deal");
    expect(payload.validUntil).toBeUndefined();
    expect(payload.notes).toBe("hi");
  });

  it("defaults a blank title to the commercial discount label", () => {
    const payload = buildPricingOfferPayload({
      clinicId: "c1",
      percentOff: "10",
      title: "   ",
      validUntil: "",
      notes: "",
    });
    expect(payload.title).toBe("Commercial discount");
  });
});

describe("validatePricingOfferParams", () => {
  it("accepts a percent within range with a clinic id", () => {
    expect(validatePricingOfferParams(10, "c1")).toBeNull();
  });

  it.each([-1, 96, NaN])("rejects out-of-range percent %s", (p) => {
    expect(validatePricingOfferParams(p, "c1")).toMatch(/between 0 and 95/);
  });

  it("requires a clinic id", () => {
    expect(validatePricingOfferParams(10, "")).toBe("Select a facility.");
  });
});

describe("extractAdditionalChargeError", () => {
  it("prefers the amount error, then category, then paymentMethod", () => {
    expect(extractAdditionalChargeError({ amount: ["bad amount"] })).toBe(
      "bad amount",
    );
    expect(extractAdditionalChargeError({ category: ["bad category"] })).toBe(
      "bad category",
    );
    expect(extractAdditionalChargeError({})).toMatch(/Check the form/);
  });
});

describe("buildAdditionalChargeRequestPayload", () => {
  it("parses the amount and drops blank optional fields", () => {
    const payload = buildAdditionalChargeRequestPayload(
      {
        category: "GUIDED_SETUP",
        amount: "250.00",
        paymentMethod: "manual",
        razorpayPaymentId: "  ",
        notes: "  ",
      },
      "INR",
    );
    expect(payload.amount).toBe(250);
    expect(payload.currency).toBe("INR");
    expect(payload.razorpayPaymentId).toBeUndefined();
    expect(payload.notes).toBeUndefined();
  });
});

describe("derivePaymentPageStatus", () => {
  it("is loading while any dependency is loading", () => {
    expect(derivePaymentPageStatus(true, false, false)).toBe("loading");
    expect(derivePaymentPageStatus(false, true, false)).toBe("loading");
    expect(derivePaymentPageStatus(false, false, true)).toBe("loading");
  });

  it("is success once everything has loaded", () => {
    expect(derivePaymentPageStatus(false, false, false)).toBe("success");
  });
});
