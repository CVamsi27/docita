import { Tier } from "../billing/tier";

/**
 * Maps persisted clinic tier strings (Prisma `ClinicTier` and legacy values) to
 * the numeric access `Tier` used by `FEATURE_TIER_MAP` and guards.
 */
export function mapClinicTierDbStringToAccessTier(dbTier: string): Tier {
  const map: Record<string, Tier> = {
    STARTER: Tier.STARTER,
    ESSENTIAL: Tier.ESSENTIAL,
    PROFESSIONAL: Tier.PROFESSIONAL,
    ENTERPRISE: Tier.ENTERPRISE,
    CAPTURE: Tier.STARTER,
    FREE: Tier.STARTER,
    CORE: Tier.ESSENTIAL,
    PLUS: Tier.ESSENTIAL,
    PRO: Tier.PROFESSIONAL,
    CLINIC: Tier.PROFESSIONAL,
  };

  return map[dbTier] ?? Tier.STARTER;
}
