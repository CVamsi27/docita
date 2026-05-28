import { Tier, type TierName, tierSchema } from "../billing/tier";

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
 * Maps persisted clinic tier strings (Prisma `ClinicTier` and legacy values) to
 * billing / access {@link TierName} for feature checks and pricing.
 */
export function mapDbClinicTierStringToTierName(dbTier: string): TierName {
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
  const canonical = tierSchema.safeParse(dbTier);
  if (canonical.success) {
    return Tier[canonical.data];
  }
  return LEGACY_CLINIC_TIER_TO_ACCESS_TIER[dbTier] ?? Tier.STARTER;
}
