import { type PlanMode, Tier, type TierName, tierSchema } from "../billing/tier";

const LEGACY_CLINIC_TIER_TO_ACCESS_TIER: Record<string, Tier> = {
  CAPTURE: Tier.STARTER,
  FREE: Tier.STARTER,
  CORE: Tier.ESSENTIAL,
  PLUS: Tier.ESSENTIAL,
  PRO: Tier.PROFESSIONAL,
  CLINIC: Tier.PROFESSIONAL,
};

const LEGACY_CLINIC_TIER_TO_TIER_NAME: Record<string, TierName> = {
  CAPTURE: "STARTER",
  FREE: "STARTER",
  CORE: "ESSENTIAL",
  PLUS: "ESSENTIAL",
  PRO: "PROFESSIONAL",
  CLINIC: "PROFESSIONAL",
};

/**
 * Legacy FRONT_DESK_* DB tier values are auto-mapped to a (clinical tier,
 * mode=FRONT_DESK) pair at read time so the rest of the app only sees the new
 * 5-tier × mode model. Existing rows do not need to be migrated.
 */
const LEGACY_FRONT_DESK_TIER_TO_TIER_NAME: Record<string, TierName> = {
  FRONT_DESK: "ESSENTIAL",
  FRONT_DESK_CLINIC: "PROFESSIONAL",
  FRONT_DESK_HOSPITAL: "HOSPITAL",
};

const FRONT_DESK_DB_TIER_VALUES: ReadonlySet<string> = new Set([
  "FRONT_DESK",
  "FRONT_DESK_CLINIC",
  "FRONT_DESK_HOSPITAL",
]);

/**
 * Maps persisted clinic tier strings (Prisma `ClinicTier` and legacy values) to
 * billing / access {@link TierName} for feature checks and pricing.
 *
 * Legacy FRONT_DESK_* values are folded onto the clinical ladder; callers that
 * also need to know the resulting `PlanMode` should use
 * {@link mapDbClinicTierToTierAndMode} instead.
 */
export function mapDbClinicTierStringToTierName(dbTier: string): TierName {
  if (FRONT_DESK_DB_TIER_VALUES.has(dbTier)) {
    return LEGACY_FRONT_DESK_TIER_TO_TIER_NAME[dbTier] ?? "ESSENTIAL";
  }
  const direct = tierSchema.safeParse(dbTier);
  if (direct.success) {
    return direct.data;
  }
  return LEGACY_CLINIC_TIER_TO_TIER_NAME[dbTier] ?? "STARTER";
}

/**
 * Maps persisted clinic tier strings (Prisma `ClinicTier` and legacy values) to
 * the numeric access `Tier` used by `FEATURE_TIER_MAP` and the app permission store.
 */
export function mapClinicTierDbStringToAccessTier(dbTier: string): Tier {
  if (FRONT_DESK_DB_TIER_VALUES.has(dbTier)) {
    return Tier[LEGACY_FRONT_DESK_TIER_TO_TIER_NAME[dbTier] ?? "ESSENTIAL"];
  }
  const canonical = tierSchema.safeParse(dbTier);
  if (canonical.success) {
    return Tier[canonical.data];
  }
  return LEGACY_CLINIC_TIER_TO_ACCESS_TIER[dbTier] ?? Tier.STARTER;
}

/**
 * Resolves a persisted clinic tier + persisted `planMode` column into the
 * canonical (tier, mode) tuple. When a clinic is on a legacy `FRONT_DESK_*`
 * DB tier, the persisted `planMode` is ignored and `FRONT_DESK` is returned
 * regardless — it would have been the customer's intent.
 */
export function mapDbClinicTierToTierAndMode(
  dbTier: string,
  dbPlanMode: string | null | undefined,
): { tier: TierName; mode: PlanMode } {
  if (FRONT_DESK_DB_TIER_VALUES.has(dbTier)) {
    return {
      tier: LEGACY_FRONT_DESK_TIER_TO_TIER_NAME[dbTier] ?? "ESSENTIAL",
      mode: "FRONT_DESK",
    };
  }
  const tier = mapDbClinicTierStringToTierName(dbTier);
  const mode: PlanMode =
    dbPlanMode === "FRONT_DESK" || dbPlanMode === "CORE" ? dbPlanMode : "FULL";
  return { tier, mode };
}
