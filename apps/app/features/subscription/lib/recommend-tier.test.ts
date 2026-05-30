import { describe, expect, it } from "vitest";
import type { CurrentUsage } from "@workspace/types";
import { recommendTier } from "./recommend-tier";

function buildUsage(overrides: Partial<CurrentUsage["usage"]> = {}): CurrentUsage {
  return {
    period: { start: "2026-05-01T00:00:00.000Z", end: "2026-05-31T23:59:59.000Z" },
    usage: {
      consultations: 10,
      users: 2,
      whatsappMessages: 50,
      aiCredits: 400,
      ...overrides,
    },
    included: {
      consultations: 50,
      users: 3,
      whatsappMessages: 200,
      aiCredits: 500,
    },
    overages: {
      consultations: 0,
      users: 0,
      whatsappMessages: 0,
      aiCredits: 0,
    },
    rates: {
      consultations: 2,
      users: 10,
      whatsappMessages: 0.5,
      aiCredits: 0,
    },
    breakdown: {
      consultations: { quantity: 0, rate: 2, charge: 0 },
      users: { quantity: 0, rate: 10, charge: 0 },
      whatsappMessages: { quantity: 0, rate: 0.5, charge: 0 },
      aiCredits: { quantity: 0, rate: 0, charge: 0 },
    },
    total: 0,
    meters: {
      consultations: { current: 10, included: 50, overage: 0 },
      users: { current: 2, included: 3, overage: 0 },
      whatsappMessages: { current: 50, included: 200, overage: 0 },
      aiCredits: { current: 400, included: 500, overage: 0 },
    },
    warnings: {
      consultations: { percentUsed: 20, threshold: null },
      users: { percentUsed: 67, threshold: null },
      whatsappMessages: { percentUsed: 25, threshold: null },
      aiCredits: { percentUsed: 80, threshold: 80 },
    },
    tier: "ESSENTIAL",
  };
}

describe("recommendTier", () => {
  it("returns null when usage fits the current tier", () => {
    expect(recommendTier("ESSENTIAL", buildUsage())).toBeNull();
  });

  it("suggests an upgrade when AI credits exceed the current allotment", () => {
    const result = recommendTier(
      "STARTER",
      buildUsage({ aiCredits: 150, consultations: 5, users: 1, whatsappMessages: 0 }),
    );

    expect(result?.tier).toBe("ESSENTIAL");
    expect(result?.reasons.some((reason) => reason.includes("AI credits"))).toBe(
      true,
    );
  });
});
