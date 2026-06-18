import { type PlanMode, Tier, type TierName, tierSchema } from "../billing/tier";

/**
 * Maps persisted clinic tier strings (Prisma `ClinicTier`) to
 * billing / access {@link TierName} for feature checks and pricing.
 */
export function mapDbClinicTierStringToTierName(dbTier: string): TierName {
  const direct = tierSchema.safeParse(dbTier);
  if (direct.success) return direct.data;
  return "STARTER";
}

/**
 * Maps persisted clinic tier strings (Prisma `ClinicTier`) to
 * the numeric access `Tier` used by `FEATURE_TIER_MAP` and the app permission store.
 */
export function mapClinicTierDbStringToAccessTier(dbTier: string): Tier {
  const canonical = tierSchema.safeParse(dbTier);
  if (canonical.success) return Tier[canonical.data];
  return Tier.STARTER;
}

/**
 * Resolves a persisted clinic tier + persisted `planMode` column into the
 * canonical (tier, mode) tuple.
 */
export function mapDbClinicTierToTierAndMode(
  dbTier: string,
  dbPlanMode: string | null | undefined,
): { tier: TierName; mode: PlanMode } {
  const tier = mapDbClinicTierStringToTierName(dbTier);
  const mode: PlanMode =
    dbPlanMode === "FRONT_DESK" || dbPlanMode === "CORE" ? dbPlanMode : "FULL";
  return { tier, mode };
}
