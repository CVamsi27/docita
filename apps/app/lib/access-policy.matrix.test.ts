import { describe, expect, it } from "vitest";
import { canAccessTarget } from "@/lib/access-policy";
import {
  APP_ACCESS_TARGETS,
  Feature,
  FEATURE_TIER_MAP,
  Tier,
  type UserRole,
  type WorkspaceProfile,
} from "@workspace/types";

function canAccessFeatureFactory(tier: Tier) {
  return (feature: Feature): boolean => {
    const required = FEATURE_TIER_MAP[feature];
    if (required === undefined) return true;
    return tier >= required;
  };
}

function canAccessTierFactory(currentTier: Tier) {
  return (tier: Tier): boolean => currentTier >= tier;
}

describe("canAccessTarget matrix parity (role x tier x target)", () => {
  const cases: Array<{
    name: string;
    role: UserRole;
    tier: Tier;
    target: (typeof APP_ACCESS_TARGETS)[keyof typeof APP_ACCESS_TARGETS];
    expectAllowed: boolean;
    workspaceProfile?: WorkspaceProfile;
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
      name: "Appointments allowed on Starter for receptionist",
      role: "RECEPTIONIST",
      tier: Tier.STARTER,
      target: APP_ACCESS_TARGETS.PAGE_APPOINTMENTS,
      expectAllowed: true,
    },
    {
      name: "Consultation blocked on front desk for admin on Essential",
      role: "ADMIN",
      tier: Tier.ESSENTIAL,
      target: APP_ACCESS_TARGETS.PAGE_CONSULTATION,
      expectAllowed: false,
      workspaceProfile: "FRONT_DESK",
    },
    {
      name: "Appointments allowed on front desk for receptionist on Starter",
      role: "RECEPTIONIST",
      tier: Tier.STARTER,
      target: APP_ACCESS_TARGETS.PAGE_APPOINTMENTS,
      expectAllowed: true,
      workspaceProfile: "FRONT_DESK",
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
      name: "Lab tests allowed on FRONT_DESK workspace for receptionist",
      role: "RECEPTIONIST",
      tier: Tier.ESSENTIAL,
      target: APP_ACCESS_TARGETS.PAGE_LAB_TESTS,
      expectAllowed: true,
      workspaceProfile: "FRONT_DESK",
    },
    {
      name: "Lab tests API allowed on FRONT_DESK workspace for receptionist",
      role: "RECEPTIONIST",
      tier: Tier.ESSENTIAL,
      target: APP_ACCESS_TARGETS.API_LAB_TESTS,
      expectAllowed: true,
      workspaceProfile: "FRONT_DESK",
    },
    {
      name: "Consultation still blocked on FRONT_DESK workspace",
      role: "ADMIN",
      tier: Tier.ESSENTIAL,
      target: APP_ACCESS_TARGETS.PAGE_CONSULTATION,
      expectAllowed: false,
      workspaceProfile: "FRONT_DESK",
    },
    {
      name: "Prescriptions still blocked on FRONT_DESK workspace",
      role: "ADMIN",
      tier: Tier.ESSENTIAL,
      target: APP_ACCESS_TARGETS.PAGE_PRESCRIPTIONS,
      expectAllowed: false,
      workspaceProfile: "FRONT_DESK",
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
    target,
    expectAllowed,
    workspaceProfile,
    mode,
  } of cases) {
    it(name, () => {
      const allowed = canAccessTarget(
        target,
        {
          role,
          canAccessFeature: canAccessFeatureFactory(tier),
          canAccessTier: canAccessTierFactory(tier),
          workspaceProfile,
        },
        mode ?? "read",
      );
      expect(allowed).toBe(expectAllowed);
    });
  }
});
