import { describe, expect, it } from "vitest";
import { canAccessTarget } from "@/lib/access-policy";
import {
  APP_ACCESS_TARGETS,
  Feature,
  FEATURE_TIER_MAP,
  Tier,
  type UserRole,
} from "@workspace/types";

function canAccessFeatureFactory(tier: Tier) {
  return (feature: Feature): boolean => {
    const required = FEATURE_TIER_MAP[feature];
    if (required === undefined) return true;
    return tier >= required;
  };
}

describe("canAccessTarget matrix parity (role x tier x target)", () => {
  const cases: Array<{
    name: string;
    role: UserRole;
    tier: Tier;
    target: (typeof APP_ACCESS_TARGETS)[keyof typeof APP_ACCESS_TARGETS];
    expectAllowed: boolean;
  }> = [
    {
      name: "WhatsApp page denied on Starter for receptionist",
      role: "RECEPTIONIST",
      tier: Tier.STARTER,
      target: APP_ACCESS_TARGETS.PAGE_WHATSAPP,
      expectAllowed: false,
    },
    {
      name: "WhatsApp page allowed on Essential for admin",
      role: "ADMIN",
      tier: Tier.ESSENTIAL,
      target: APP_ACCESS_TARGETS.PAGE_WHATSAPP,
      expectAllowed: true,
    },
    {
      name: "Coding queue denied on Starter for doctor",
      role: "DOCTOR",
      tier: Tier.STARTER,
      target: APP_ACCESS_TARGETS.PAGE_CODING_QUEUE,
      expectAllowed: false,
    },
    {
      name: "Coding queue allowed on Essential for doctor",
      role: "DOCTOR",
      tier: Tier.ESSENTIAL,
      target: APP_ACCESS_TARGETS.PAGE_CODING_QUEUE,
      expectAllowed: true,
    },
    {
      name: "Appointments allowed on Starter for receptionist",
      role: "RECEPTIONIST",
      tier: Tier.STARTER,
      target: APP_ACCESS_TARGETS.PAGE_APPOINTMENTS,
      expectAllowed: true,
    },
  ];

  for (const { name, role, tier, target, expectAllowed } of cases) {
    it(name, () => {
      const allowed = canAccessTarget(
        target,
        { role, canAccessFeature: canAccessFeatureFactory(tier) },
        "read",
      );
      expect(allowed).toBe(expectAllowed);
    });
  }
});
