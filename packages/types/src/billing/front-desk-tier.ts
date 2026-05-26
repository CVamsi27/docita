import { FRONT_DESK_TIER_NAMES, Tier, tierSchema } from "./tier";

const FRONT_DESK_TIER_NUMERIC: ReadonlySet<number> = new Set([
  Tier.FRONT_DESK,
  Tier.FRONT_DESK_CLINIC,
  Tier.FRONT_DESK_HOSPITAL,
]);

const FRONT_DESK_TIER_STRINGS: ReadonlySet<string> = new Set(
  FRONT_DESK_TIER_NAMES,
);

/** True when the clinic is on any Front Desk billed SKU (solo, clinic, or hospital). */
export function isFrontDeskTier(
  tier: string | number | null | undefined,
): boolean {
  if (tier === null || tier === undefined) {
    return false;
  }
  if (typeof tier === "number") {
    return FRONT_DESK_TIER_NUMERIC.has(tier);
  }
  if (FRONT_DESK_TIER_STRINGS.has(tier)) {
    return true;
  }
  const parsed = tierSchema.safeParse(tier);
  return parsed.success && FRONT_DESK_TIER_STRINGS.has(parsed.data);
}

/** True only for the solo Front Desk SKU (1 desk, 1 location). */
export function isFrontDeskSolo(
  tier: string | number | null | undefined,
): boolean {
  return tier === Tier.FRONT_DESK || tier === "FRONT_DESK";
}

/** True for the multi-desk clinic Front Desk SKU. */
export function isFrontDeskClinic(
  tier: string | number | null | undefined,
): boolean {
  return tier === Tier.FRONT_DESK_CLINIC || tier === "FRONT_DESK_CLINIC";
}

/** True for the multi-location hospital Front Desk SKU. */
export function isFrontDeskHospital(
  tier: string | number | null | undefined,
): boolean {
  return tier === Tier.FRONT_DESK_HOSPITAL || tier === "FRONT_DESK_HOSPITAL";
}

/** Operational scale of a Front Desk SKU. Returns null when not a Front Desk SKU. */
export function getFrontDeskScale(
  tier: string | number | null | undefined,
): "SOLO" | "CLINIC" | "HOSPITAL" | null {
  if (isFrontDeskSolo(tier)) return "SOLO";
  if (isFrontDeskClinic(tier)) return "CLINIC";
  if (isFrontDeskHospital(tier)) return "HOSPITAL";
  return null;
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
