import { describe, expect, it } from "vitest";
import {
  AI_CREDIT_ALLOTMENT_BY_TIER,
  computeAiCreditBalance,
  getAiCreditAllotment,
  isAiCreditEnforced,
  isAiCreditExhausted,
  isAnyAiCreditTierEnforced,
  tierSchema,
} from "../src";

describe("AI credit allotment config", () => {
  it("defines an allotment entry for every tier", () => {
    for (const tier of tierSchema.options) {
      expect(AI_CREDIT_ALLOTMENT_BY_TIER).toHaveProperty(tier);
    }
  });

  it("enforces finite allotments on standard tiers", () => {
    expect(getAiCreditAllotment("STARTER")).toBe(100);
    expect(getAiCreditAllotment("ESSENTIAL")).toBe(500);
    expect(getAiCreditAllotment("PROFESSIONAL")).toBe(2000);
    expect(isAiCreditEnforced("STARTER")).toBe(true);
  });

  it("leaves enterprise and intelligence tiers unpriced", () => {
    expect(getAiCreditAllotment("ENTERPRISE")).toBeNull();
    expect(getAiCreditAllotment("INTELLIGENCE")).toBeNull();
    expect(isAiCreditEnforced("ENTERPRISE")).toBe(false);
  });
});

describe("computeAiCreditBalance", () => {
  it("treats a null allotment as unlimited and never enforced", () => {
    expect(computeAiCreditBalance(null, 9999)).toEqual({
      allotment: null,
      used: 9999,
      remaining: null,
      enforced: false,
    });
  });

  it("computes remaining and marks enforced when a finite allotment is set", () => {
    expect(computeAiCreditBalance(2000, 1500)).toEqual({
      allotment: 2000,
      used: 1500,
      remaining: 500,
      enforced: true,
    });
  });

  it("never returns negative remaining once the allotment is exceeded", () => {
    const balance = computeAiCreditBalance(100, 250);
    expect(balance.remaining).toBe(0);
    expect(balance.enforced).toBe(true);
  });

  it("clamps negative and fractional usage", () => {
    expect(computeAiCreditBalance(100, -5).used).toBe(0);
    expect(computeAiCreditBalance(100, 3.9).used).toBe(3);
  });
});

describe("AI credit gate decision", () => {
  it("reports at least one tier enforced", () => {
    expect(isAnyAiCreditTierEnforced()).toBe(true);
  });

  it("never marks an unpriced (null) allotment as exhausted", () => {
    expect(isAiCreditExhausted(null, 1_000_000)).toBe(false);
  });

  it("marks a finite allotment exhausted only at/over the limit", () => {
    expect(isAiCreditExhausted(100, 50)).toBe(false);
    expect(isAiCreditExhausted(100, 100)).toBe(true);
    expect(isAiCreditExhausted(100, 250)).toBe(true);
  });
});
