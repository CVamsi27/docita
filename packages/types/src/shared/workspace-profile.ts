import { z } from "zod";
import { Tier, tierSchema } from "../billing/tier";

export const WORKSPACE_PROFILE_VALUES = ["FULL_CLINICAL", "FRONT_DESK"] as const;

export const workspaceProfileSchema = z.enum(WORKSPACE_PROFILE_VALUES);

export type WorkspaceProfile = z.infer<typeof workspaceProfileSchema>;

export const DEFAULT_WORKSPACE_PROFILE: WorkspaceProfile = "FULL_CLINICAL";

export function parseWorkspaceProfile(
  value: unknown,
): WorkspaceProfile {
  const parsed = workspaceProfileSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_WORKSPACE_PROFILE;
}

export function isFrontDeskWorkspace(
  profile: WorkspaceProfile | null | undefined,
): boolean {
  return profile === "FRONT_DESK";
}

/** True when the billed SKU is Front Desk (workspace profile is implied). */
export function isFrontDeskTier(
  tier: string | number | null | undefined,
): boolean {
  if (tier === null || tier === undefined) {
    return false;
  }
  if (tier === Tier.FRONT_DESK || tier === "FRONT_DESK") {
    return true;
  }
  if (typeof tier === "string") {
    const parsed = tierSchema.safeParse(tier);
    return parsed.success && parsed.data === "FRONT_DESK";
  }
  return false;
}

/**
 * Front-desk gating: FRONT_DESK tier always implies front-desk mode; other tiers
 * may still opt into front-desk workspace via settings/onboarding.
 */
export function isFrontDeskClinicMode(
  tier: string | number | null | undefined,
  workspaceProfile?: WorkspaceProfile | null,
): boolean {
  if (isFrontDeskTier(tier)) {
    return true;
  }
  return isFrontDeskWorkspace(workspaceProfile);
}

/** Onboarding/API: FRONT_DESK tier forces workspace; otherwise honor explicit choice. */
export function resolveWorkspaceProfileForPlan(
  tier: string,
  selectedWorkspace?: WorkspaceProfile | null,
): WorkspaceProfile {
  if (isFrontDeskTier(tier)) {
    return "FRONT_DESK";
  }
  return selectedWorkspace ?? DEFAULT_WORKSPACE_PROFILE;
}

/** Short labels for settings, billing, and onboarding (no emoji). */
export const WORKSPACE_PROFILE_LABEL: Record<WorkspaceProfile, string> = {
  FULL_CLINICAL: "Full clinical workspace",
  FRONT_DESK: "Front desk (appointments and invoices)",
};

/** Bullet lines for marketing / plan comparison (shared across surfaces). */
export const WORKSPACE_PROFILE_MARKETING: Record<
  WorkspaceProfile,
  { headline: string; included: string[]; notIncluded: string[] }
> = {
  FULL_CLINICAL: {
    headline: "Full clinical workspace",
    included: [
      "Consultation workspace and visit documentation",
      "Prescriptions, labs, and specialty workflows per your tier",
      "Standard role mix including doctors and nurses",
    ],
    notIncluded: [],
  },
  FRONT_DESK: {
    headline: "Front desk workspace",
    included: [
      "Patient scheduling, queue, and appointments",
      "Invoicing and payment links",
      "Lab order intake and lab-test invoicing",
      "Admin and receptionist operations (doctor profiles for assignment only)",
    ],
    notIncluded: [
      "Consultation workspace and structured clinical documentation apps",
      "Prescription authoring and medical coding apps",
      "Doctor and admin-doctor sign-in (clinical staff use other tools)",
    ],
  },
};
