import { z } from "zod";

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
