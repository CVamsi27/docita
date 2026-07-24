import { Tier } from "@workspace/types";
import {
  normalizeSubscription,
  isValidStatus,
  createDefaultSubscription,
} from "./repository-subscription-helpers";

describe("isValidStatus", () => {
  it("returns true for active", () => {
    expect(isValidStatus("active")).toBe(true);
  });

  it("returns true for past_due", () => {
    expect(isValidStatus("past_due")).toBe(true);
  });

  it("returns true for canceled", () => {
    expect(isValidStatus("canceled")).toBe(true);
  });

  it("returns true for trialing", () => {
    expect(isValidStatus("trialing")).toBe(true);
  });

  it("returns false for invalid status", () => {
    expect(isValidStatus("invalid")).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isValidStatus(undefined)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isValidStatus("")).toBe(false);
  });
});

describe("createDefaultSubscription", () => {
  it("returns STARTER tier", () => {
    const sub = createDefaultSubscription();
    expect(sub.tier).toBe(Tier.STARTER);
  });

  it("returns active status", () => {
    const sub = createDefaultSubscription();
    expect(sub.status).toBe("active");
  });

  it("returns empty features", () => {
    const sub = createDefaultSubscription();
    expect(sub.features).toEqual([]);
  });

  it("returns monthly billing cycle", () => {
    const sub = createDefaultSubscription();
    expect(sub.billingCycle).toBe("monthly");
  });

  it("returns a recent startDate", () => {
    const before = Date.now();
    const sub = createDefaultSubscription();
    const after = Date.now();
    expect(sub.startDate.getTime()).toBeGreaterThanOrEqual(before);
    expect(sub.startDate.getTime()).toBeLessThanOrEqual(after);
  });
});

describe("normalizeSubscription", () => {
  it("returns default subscription for non-record input", () => {
    expect(normalizeSubscription(null).tier).toBe(Tier.STARTER);
    expect(normalizeSubscription(undefined).tier).toBe(Tier.STARTER);
    expect(normalizeSubscription("string").tier).toBe(Tier.STARTER);
  });

  it("normalizes a valid subscription object", () => {
    const result = normalizeSubscription({
      tier: "PROFESSIONAL",
      status: "active",
      features: ["DIGITAL_PRESCRIPTIONS", "INVOICING"],
      startDate: "2026-01-01",
      billingCycle: "yearly",
    });
    expect(result.tier).toBe(Tier.PROFESSIONAL);
    expect(result.status).toBe("active");
    expect(result.features).toEqual(["DIGITAL_PRESCRIPTIONS", "INVOICING"]);
    expect(result.billingCycle).toBe("yearly");
  });

  it("defaults to active for invalid status", () => {
    const result = normalizeSubscription({
      tier: "ESSENTIAL",
      status: "invalid",
    });
    expect(result.status).toBe("active");
  });

  it("defaults billingCycle to monthly for non-yearly values", () => {
    const result = normalizeSubscription({
      tier: "STARTER",
      billingCycle: "custom",
    });
    expect(result.billingCycle).toBe("monthly");
  });

  it("sets undefined endDate when not provided", () => {
    const result = normalizeSubscription({
      tier: "STARTER",
    });
    expect(result.endDate).toBeUndefined();
  });

  it("parses endDate when provided", () => {
    const result = normalizeSubscription({
      tier: "STARTER",
      endDate: "2026-12-31",
    });
    expect(result.endDate).toBeInstanceOf(Date);
  });
});
