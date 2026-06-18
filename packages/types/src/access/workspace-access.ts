import { APP_ACCESS_TARGETS, type AppAccessTarget } from "./access-matrix";
import type { UserRole } from "../shared/users";
import { type PlanMode } from "../billing/tier";
import { mapDbClinicTierToTierAndMode } from "./clinic-tier-map";

/**
 * Clinical / EHR-heavy surfaces disabled for all clinic roles when the clinic
 * is on the Front Desk tier. INTERNAL bypasses in the app gate.
 */
export const FRONT_DESK_BLOCKED_ACCESS_TARGETS: ReadonlySet<AppAccessTarget> =
  new Set([
    APP_ACCESS_TARGETS.PAGE_CONSULTATION,
    APP_ACCESS_TARGETS.PAGE_PRESCRIPTIONS,
    APP_ACCESS_TARGETS.PAGE_DOCUMENTS,
    APP_ACCESS_TARGETS.PAGE_SPECIALTY,
    APP_ACCESS_TARGETS.PAGE_CODING_QUEUE,
    APP_ACCESS_TARGETS.PAGE_AI_ASSISTANT,
    APP_ACCESS_TARGETS.PAGE_HOSPITAL,

    APP_ACCESS_TARGETS.API_PRESCRIPTIONS,
    APP_ACCESS_TARGETS.API_MEDICAL_DOCUMENTS,
    APP_ACCESS_TARGETS.API_MEDICAL_CODING,
  ]);

export function isFrontDeskBlockedAccessTarget(
  target: AppAccessTarget,
): boolean {
  return FRONT_DESK_BLOCKED_ACCESS_TARGETS.has(target);
}

/**
 * Resolves canonical plan mode from persisted clinic tier + optional planMode column.
 */
export function resolveClinicPlanMode(
  dbTier: string,
  dbPlanMode?: string | null,
): PlanMode {
  return mapDbClinicTierToTierAndMode(dbTier, dbPlanMode).mode;
}

/** True when the clinic is on Front Desk mode (legacy tier SKU or planMode column). */
export function isFrontDeskPlanMode(
  dbTier: string,
  dbPlanMode?: string | null,
): boolean {
  return resolveClinicPlanMode(dbTier, dbPlanMode) === "FRONT_DESK";
}

// jscpd:ignore-start
export function shouldDenyAccessForFrontDeskMode(
  target: AppAccessTarget,
  role: UserRole | string | null | undefined,
  dbTier: string,
  dbPlanMode?: string | null,
): boolean {
  if (!isFrontDeskPlanMode(dbTier, dbPlanMode)) {
    return false;
  }

  if (!isFrontDeskBlockedAccessTarget(target)) {
    return false;
  }

  if (role === "INTERNAL") return false;

  return true;
}
// jscpd:ignore-end

/**
 * @deprecated Prefer {@link shouldDenyAccessForFrontDeskMode} with tier + planMode.
 * Retained temporarily for callers that haven't migrated yet.
 */
export function shouldDenyAccessForFrontDeskTier(
  target: AppAccessTarget,
  role: UserRole | string | null | undefined,
  tier?: string | number | null,
  dbPlanMode?: string | null,
): boolean {
  // Delegate to the non-deprecated version which handles both the
  // legacy FRONT_DESK_* tier strings (pre-migration) and the new
  // (tier, mode=FRONT_DESK) model.
  const tierName =
    typeof tier === "string"
      ? tier
      : tier != null
        ? String(tier)
        : "STARTER";
  return shouldDenyAccessForFrontDeskMode(
    target,
    role,
    tierName,
    dbPlanMode,
  );
}
