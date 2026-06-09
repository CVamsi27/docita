import { Tier, tierSchema } from "./tier";

/** True when the clinic is on the Front Desk billed SKU. */
export function isFrontDeskTier(
  tier: string | number | null | undefined,
): boolean {
  if (tier === null || tier === undefined) return false;
  if (
    tier === Tier.FRONT_DESK ||
    tier === Tier.FRONT_DESK_CLINIC ||
    tier === Tier.FRONT_DESK_HOSPITAL ||
    tier === "FRONT_DESK" ||
    tier === "FRONT_DESK_CLINIC" ||
    tier === "FRONT_DESK_HOSPITAL"
  ) return true;
  if (typeof tier === "string") {
    const parsed = tierSchema.safeParse(tier);
    return (
      parsed.success &&
      (parsed.data === "FRONT_DESK" ||
        parsed.data === "FRONT_DESK_CLINIC" ||
        parsed.data === "FRONT_DESK_HOSPITAL")
    );
  }
  return false;
}

/** Short label for billing and onboarding (no emoji). */
export const FRONT_DESK_TIER_LABEL = "Front desk (appointments and invoices)";

/** Bullet lines for marketing / plan comparison (shared across surfaces). */
export const FRONT_DESK_TIER_MARKETING = {
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
} as const;
