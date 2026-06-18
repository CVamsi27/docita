import { Tier } from "@workspace/types";

const TIER_NUMERIC_VALUES = new Set(
  Object.values(Tier).filter(
    (value): value is Tier => typeof value === "number",
  ),
);
const TIER_BY_NAME: Record<string, Tier> = {
  STARTER: Tier.STARTER,
  ESSENTIAL: Tier.ESSENTIAL,
  PROFESSIONAL: Tier.PROFESSIONAL,
  HOSPITAL: Tier.HOSPITAL,
  ENTERPRISE: Tier.ENTERPRISE,
  INTELLIGENCE: Tier.INTELLIGENCE,
};

export function parseTier(value?: string): Tier {
  if (!value) return Tier.STARTER;
  const numericTier = Number(value);
  if (Number.isInteger(numericTier) && TIER_NUMERIC_VALUES.has(numericTier)) {
    return numericTier;
  }
  const mappedTier = resolveTierByName(value);
  return mappedTier ?? Tier.STARTER;
}

function resolveTierByName(value: string): Tier | undefined {
  return TIER_BY_NAME[value];
}
