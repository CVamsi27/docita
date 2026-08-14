import { describe, expect, it } from "vitest";
import type { CurrentUsage } from "@workspace/types";
import { recommendTier } from "./recommend-tier";

const METER = { current: 0, included: 0, overage: 0 };
const CHARGE = { quantity: 0, rate: 0, charge: 0 };
const WARNING = { percentUsed: 0, threshold: null };

function mockUsage(usage: {
  consultations: number;
  users: number;
  whatsappMessages?: number;
  aiCredits?: number;
}): CurrentUsage {
  return {
    period: { start: "2026-01-01T00:00:00Z", end: "2026-01-31T00:00:00Z" },
    usage: {
      consultations: usage.consultations,
      users: usage.users,
      whatsappMessages: usage.whatsappMessages ?? 0,
      aiCredits: usage.aiCredits ?? 0,
    },
    included: { consultations: 0, users: 0, whatsappMessages: 0, aiCredits: 0 },
    overages: { consultations: 0, users: 0, whatsappMessages: 0, aiCredits: 0 },
    rates: { consultations: 0, users: 0, whatsappMessages: 0, aiCredits: 0 },
    breakdown: {
      consultations: CHARGE,
      users: CHARGE,
      whatsappMessages: CHARGE,
      aiCredits: CHARGE,
    },
    total: 0,
    meters: {
      consultations: METER,
      users: METER,
      whatsappMessages: METER,
      aiCredits: METER,
    },
    warnings: {
      consultations: WARNING,
      users: WARNING,
      whatsappMessages: WARNING,
      aiCredits: WARNING,
    },
    tier: "STARTER",
  };
}

describe("recommendTier", () => {
  it("returns null when usage is missing", () => {
    expect(recommendTier("STARTER", null)).toBeNull();
    expect(recommendTier("STARTER", undefined)).toBeNull();
  });

  it("returns null when the current tier is not on the published ladder", () => {
    expect(recommendTier("INTELLIGENCE", mockUsage({ consultations: 1000, users: 50 }))).toBeNull();
  });

  it("returns null when usage is within the current tier", () => {
    expect(
      recommendTier("STARTER", mockUsage({ consultations: 30, users: 1 })),
    ).toBeNull();
  });

  it("recommends the next covering tier with a reason for each exceeded limit", () => {
    const recommendation = recommendTier(
      "STARTER",
      mockUsage({ consultations: 100, users: 3 }),
    );

    expect(recommendation?.tier).toBe("ESSENTIAL");
    expect(recommendation?.reasons).toContain(
      "100 consultations this period vs 50 included on STARTER",
    );
    expect(recommendation?.reasons).toContain(
      "3 active users vs 1 included on STARTER",
    );
  });

  it("does not over-recommend when a higher tier is also exceeded", () => {
    // 600 consultations exceeds ESSENTIAL (500) but fits PROFESSIONAL (2000),
    // so the recommendation must skip ESSENTIAL and land on PROFESSIONAL.
    const recommendation = recommendTier(
      "STARTER",
      mockUsage({ consultations: 600, users: 1 }),
    );

    expect(recommendation?.tier).toBe("PROFESSIONAL");
    expect(recommendation?.reasons[0]).toContain("600 consultations");
  });

  it("returns null when no published tier covers the usage", () => {
    // ENTERPRISE caps at 999999 appointments / 999 users.
    expect(
      recommendTier("STARTER", mockUsage({ consultations: 1000000, users: 1000 })),
    ).toBeNull();
  });

  it("returns null when the current tier is the top of the ladder", () => {
    expect(
      recommendTier("ENTERPRISE", mockUsage({ consultations: 100000, users: 500 })),
    ).toBeNull();
  });
});
