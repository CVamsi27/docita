import { describe, expect, it } from "vitest";
import { canAccessTarget } from "@/lib/access-control/access-policy";
import {
  APP_ACCESS_TARGETS,
  Feature,
  FEATURE_TIER_MAP,
  Tier,
  type PlanMode,
  type UserRole,
} from "@workspace/types";
import { getTierName, hasFeatureAccess } from "@workspace/utils";

function canAccessFeatureFactory(tier: Tier, mode: PlanMode = "FULL") {
  return (feature: Feature): boolean => {
    if (FEATURE_TIER_MAP[feature] === undefined) return true;
    return hasFeatureAccess(getTierName(tier), feature, false, undefined, mode);
  };
}

describe("canAccessTarget matrix parity (role x tier x target)", () => {
  const cases: Array<{
    name: string;
    role: UserRole;
    tier: Tier;
    planMode?: PlanMode;
    target: (typeof APP_ACCESS_TARGETS)[keyof typeof APP_ACCESS_TARGETS];
    expectAllowed: boolean;
    mode?: "read" | "write";
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
      name: "Appointments denied on Starter for receptionist (queue tier)",
      role: "RECEPTIONIST",
      tier: Tier.STARTER,
      target: APP_ACCESS_TARGETS.PAGE_APPOINTMENTS,
      expectAllowed: false,
    },
    {
      name: "Consultation blocked on FRONT_DESK tier for admin",
      role: "ADMIN",
      tier: Tier.FRONT_DESK,
      target: APP_ACCESS_TARGETS.PAGE_CONSULTATION,
      expectAllowed: false,
    },
    {
      name: "Prescriptions blocked on Professional + Front Desk plan mode",
      role: "ADMIN",
      tier: Tier.PROFESSIONAL,
      planMode: "FRONT_DESK",
      target: APP_ACCESS_TARGETS.PAGE_PRESCRIPTIONS,
      expectAllowed: false,
    },
    {
      name: "Appointments allowed on FRONT_DESK tier for receptionist",
      role: "RECEPTIONIST",
      tier: Tier.FRONT_DESK,
      target: APP_ACCESS_TARGETS.PAGE_APPOINTMENTS,
      expectAllowed: true,
    },
    {
      name: "Appointments allowed on Essential + Front Desk plan mode for admin",
      role: "ADMIN",
      tier: Tier.ESSENTIAL,
      planMode: "FRONT_DESK",
      target: APP_ACCESS_TARGETS.PAGE_APPOINTMENTS,
      expectAllowed: true,
    },
    {
      name: "Desk floor denied on Essential for receptionist (tier-gated)",
      role: "RECEPTIONIST",
      tier: Tier.ESSENTIAL,
      target: APP_ACCESS_TARGETS.PAGE_DESK_FLOOR,
      expectAllowed: false,
    },
    {
      name: "Desk floor denied on Professional for receptionist (tier-gated)",
      role: "RECEPTIONIST",
      tier: Tier.PROFESSIONAL,
      target: APP_ACCESS_TARGETS.PAGE_DESK_FLOOR,
      expectAllowed: false,
    },
    {
      name: "Desk floor allowed on Enterprise for receptionist",
      role: "RECEPTIONIST",
      tier: Tier.ENTERPRISE,
      target: APP_ACCESS_TARGETS.PAGE_DESK_FLOOR,
      expectAllowed: true,
    },
    {
      name: "Desk floor allowed on Hospital for admin",
      role: "ADMIN",
      tier: Tier.HOSPITAL,
      target: APP_ACCESS_TARGETS.PAGE_DESK_FLOOR,
      expectAllowed: true,
    },
    {
      name: "Desk floor denied on Enterprise for nurse (role-gated)",
      role: "NURSE",
      tier: Tier.ENTERPRISE,
      target: APP_ACCESS_TARGETS.PAGE_DESK_FLOOR,
      expectAllowed: false,
    },
    {
      name: "Lab tests allowed for receptionist on Essential (lab orders + invoicing)",
      role: "RECEPTIONIST",
      tier: Tier.ESSENTIAL,
      target: APP_ACCESS_TARGETS.PAGE_LAB_TESTS,
      expectAllowed: true,
    },
    {
      name: "Lab tests allowed on FRONT_DESK tier for receptionist",
      role: "RECEPTIONIST",
      tier: Tier.FRONT_DESK,
      target: APP_ACCESS_TARGETS.PAGE_LAB_TESTS,
      expectAllowed: true,
    },
    {
      name: "Lab tests API allowed on FRONT_DESK tier for receptionist",
      role: "RECEPTIONIST",
      tier: Tier.FRONT_DESK,
      target: APP_ACCESS_TARGETS.API_LAB_TESTS,
      expectAllowed: true,
    },
    {
      name: "Consultation still blocked on FRONT_DESK tier",
      role: "ADMIN",
      tier: Tier.FRONT_DESK,
      target: APP_ACCESS_TARGETS.PAGE_CONSULTATION,
      expectAllowed: false,
    },
    {
      name: "Prescriptions still blocked on FRONT_DESK tier",
      role: "ADMIN",
      tier: Tier.FRONT_DESK,
      target: APP_ACCESS_TARGETS.PAGE_PRESCRIPTIONS,
      expectAllowed: false,
    },
    {
      name: "Receptionist allowed PAGE_PRESCRIPTIONS read (for printing handoff)",
      role: "RECEPTIONIST",
      tier: Tier.ESSENTIAL,
      target: APP_ACCESS_TARGETS.PAGE_PRESCRIPTIONS,
      expectAllowed: true,
    },
    {
      name: "Receptionist allowed API_PRESCRIPTIONS read (list/detail/PDF)",
      role: "RECEPTIONIST",
      tier: Tier.ESSENTIAL,
      target: APP_ACCESS_TARGETS.API_PRESCRIPTIONS,
      expectAllowed: true,
      mode: "read",
    },
    {
      name: "Receptionist denied API_PRESCRIPTIONS write (cannot author)",
      role: "RECEPTIONIST",
      tier: Tier.ESSENTIAL,
      target: APP_ACCESS_TARGETS.API_PRESCRIPTIONS,
      expectAllowed: false,
      mode: "write",
    },
    {
      name: "Nurse allowed PAGE_PRESCRIPTIONS read (clinical reference)",
      role: "NURSE",
      tier: Tier.ESSENTIAL,
      target: APP_ACCESS_TARGETS.PAGE_PRESCRIPTIONS,
      expectAllowed: true,
    },
    {
      name: "Nurse denied API_PRESCRIPTIONS write (cannot author)",
      role: "NURSE",
      tier: Tier.ESSENTIAL,
      target: APP_ACCESS_TARGETS.API_PRESCRIPTIONS,
      expectAllowed: false,
      mode: "write",
    },
    {
      name: "Doctor allowed PAGE_PRESCRIPTIONS on Essential",
      role: "DOCTOR",
      tier: Tier.ESSENTIAL,
      target: APP_ACCESS_TARGETS.PAGE_PRESCRIPTIONS,
      expectAllowed: true,
    },
    {
      name: "Doctor allowed API_PRESCRIPTIONS write",
      role: "DOCTOR",
      tier: Tier.ESSENTIAL,
      target: APP_ACCESS_TARGETS.API_PRESCRIPTIONS,
      expectAllowed: true,
      mode: "write",
    },
    {
      name: "Receptionist denied PAGE_CODING_QUEUE",
      role: "RECEPTIONIST",
      tier: Tier.ESSENTIAL,
      target: APP_ACCESS_TARGETS.PAGE_CODING_QUEUE,
      expectAllowed: false,
    },
    {
      name: "Receptionist denied PAGE_DOCUMENTS",
      role: "RECEPTIONIST",
      tier: Tier.ESSENTIAL,
      target: APP_ACCESS_TARGETS.PAGE_DOCUMENTS,
      expectAllowed: false,
    },
  ];

  for (const {
    name,
    role,
    tier,
    planMode = "FULL",
    target,
    expectAllowed,
    mode,
  } of cases) {
    it(name, () => {
      const allowed = canAccessTarget(
        target,
        {
          role,
          canAccessFeature: canAccessFeatureFactory(tier, planMode),
          currentTier: tier,
          currentMode: planMode,
          hasIntelligence: false,
        },
        mode ?? "read",
      );
      expect(allowed).toBe(expectAllowed);
    });
  }
});
