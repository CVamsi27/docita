import { describe, expect, it } from "vitest";
import { Feature, Tier } from "@workspace/types";
import type { IAccessContext } from "@/lib/access-control/interfaces";
import { TierBasedAccessRule } from "./tier-based-rule";

function buildContext(
  overrides: Partial<IAccessContext> = {},
): IAccessContext {
  return {
    feature: Feature.WHATSAPP_MESSAGING,
    userId: "user-1",
    clinicId: "clinic-1",
    subscription: {
      tier: Tier.ESSENTIAL,
      status: "active",
      features: [],
      startDate: new Date(),
      billingCycle: "monthly",
    },
    addOns: [],
    userRole: "ADMIN",
    ...overrides,
  };
}

describe("TierBasedAccessRule", () => {
  const rule = new TierBasedAccessRule();

  it("grants when clinic tier meets feature requirement", () => {
    expect(rule.canAccess(buildContext())).toBe(true);
  });

  it("denies when tier is below feature requirement", () => {
    expect(
      rule.canAccess(
        buildContext({
          subscription: {
            tier: Tier.STARTER,
            status: "active",
            features: [],
            startDate: new Date(),
            billingCycle: "monthly",
          },
        }),
      ),
    ).toBe(false);
  });

  it("denies enterprise-only features on professional tier", () => {
    expect(
      rule.canAccess(
        buildContext({
          feature: Feature.DATA_WAREHOUSE_EXPORT,
          subscription: {
            tier: Tier.PROFESSIONAL,
            status: "active",
            features: [],
            startDate: new Date(),
            billingCycle: "monthly",
          },
        }),
      ),
    ).toBe(false);
  });

  it("blocks front desk from front-desk-blocked features", () => {
    expect(
      rule.canAccess(
        buildContext({
          feature: Feature.DIGITAL_PRESCRIPTIONS,
          subscription: {
            tier: Tier.FRONT_DESK,
            status: "active",
            features: [],
            startDate: new Date(),
            billingCycle: "monthly",
          },
        }),
      ),
    ).toBe(false);
  });
});
