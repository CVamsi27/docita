import {
  clinicFeatureOverridesSchema,
  type ClinicFeatureOverrides,
  clinicTypeSchema,
  type ClinicType,
  planModeSchema,
  type PlanMode,
  Tier,
  type TierName,
} from "@workspace/types";
import { mapClinicTierDbStringToAccessTier } from "@workspace/types/access";
import { getTierName } from "@workspace/utils";

export function parseTierInput(tier: Tier | string | null | undefined): Tier {
  if (tier === null || tier === undefined) return Tier.STARTER;
  return typeof tier === "string"
    ? mapClinicTierDbStringToAccessTier(tier)
    : tier;
}

export function parsePlanModeInput(
  mode: PlanMode | string | null | undefined,
): PlanMode {
  const parsed = planModeSchema.safeParse(mode ?? "FULL");
  return parsed.success ? parsed.data : "FULL";
}

export function parseClinicTypeInput(
  type: ClinicType | string | null,
): ClinicType | null {
  if (type === null) return null;
  const raw = typeof type === "string" ? type.toUpperCase() : type;
  const parsed = clinicTypeSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function parseFeatureOverridesInput(
  overrides: ClinicFeatureOverrides | Record<string, boolean> | null | undefined,
): ClinicFeatureOverrides {
  const parsed = clinicFeatureOverridesSchema.safeParse(overrides ?? {});
  return parsed.success ? parsed.data : {};
}

export function resolveTierName(tier: Tier): TierName {
  return getTierName(tier);
}
