/**
 * True when the clinic is on a Front Desk plan mode.
 *
 * This replaces the old tier-based check (which relied on FRONT_DESK_* DB enum
 * values that have been migrated to canonical (tier, mode=FRONT_DESK) pairs).
 *
 * Prefer {@link isFrontDeskPlanMode} from `@workspace/types/access` when you
 * have both `dbTier` and `dbPlanMode`. This helper is kept for callers that
 * already have the resolved `PlanMode`.
 */
export function isFrontDeskTier(
  tierOrMode: string | number | null | undefined,
): boolean {
  if (tierOrMode === null || tierOrMode === undefined) return false;
  if (typeof tierOrMode === "string") {
    return tierOrMode === "FRONT_DESK";
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
