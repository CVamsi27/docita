import { ForbiddenException } from '@nestjs/common';
import { ClinicTier, IntelligenceAddon } from '@workspace/db';
import { Feature, mapDbClinicTierStringToTierName } from '@workspace/types';
import { hasFeatureAccess, isFeatureGenerallyAvailable } from '@workspace/utils';
import {
  FEATURE_TIER_MAP,
  Tier,
} from '@/shared/modules/auth/auth/tier.decorator';

export type ClinicFeatureAuthSnapshot = {
  tier: ClinicTier;
  intelligenceAddon: IntelligenceAddon;
  features: unknown;
};

function getTierDisplayName(tier: Tier): string {
  const names: Record<Tier, string> = {
    [Tier.STARTER]: 'Starter',
    [Tier.ESSENTIAL]: 'Essential',
    [Tier.PROFESSIONAL]: 'Professional',
    [Tier.HOSPITAL]: 'Hospital',
    [Tier.ENTERPRISE]: 'Enterprise',
    [Tier.INTELLIGENCE]: 'Intelligence',
    [Tier.FRONT_DESK]: 'Front desk',
  };
  return names[tier] || 'Unknown';
}

/**
 * Enforces the same feature rules as {@link TierGuard} for a single feature.
 * Call after subscription / clinic existence checks.
 */
export function assertClinicHasFeatureOrThrow(
  clinic: ClinicFeatureAuthSnapshot,
  requiredFeature: Feature,
): void {
  if (!isFeatureGenerallyAvailable(requiredFeature)) {
    throw new ForbiddenException(
      `The ${requiredFeature} feature is not available yet.`,
    );
  }

  const featureTier = FEATURE_TIER_MAP[requiredFeature];
  const featureOverrides =
    (clinic.features as Record<string, boolean> | null | undefined) || {};

  if (featureOverrides[requiredFeature] !== undefined) {
    if (!featureOverrides[requiredFeature]) {
      throw new ForbiddenException(
        `The ${requiredFeature} feature is not available for your clinic.`,
      );
    }
    return;
  }

  if (featureTier === Tier.INTELLIGENCE) {
    if (clinic.intelligenceAddon !== IntelligenceAddon.ACTIVE) {
      throw new ForbiddenException(
        'This feature requires the Intelligence add-on.',
      );
    }
    return;
  }

  const tierName = mapDbClinicTierStringToTierName(clinic.tier);
  const hasIntelligence = clinic.intelligenceAddon === IntelligenceAddon.ACTIVE;
  if (!hasFeatureAccess(tierName, requiredFeature, hasIntelligence)) {
    throw new ForbiddenException(
      `This feature requires ${getTierDisplayName(featureTier)} tier or higher.`,
    );
  }
}

/**
 * Same rules as {@link assertClinicHasFeatureOrThrow}, for background jobs
 * that should skip work instead of throwing.
 */
export function clinicHasFeatureForAccess(
  clinic: ClinicFeatureAuthSnapshot,
  feature: Feature,
): boolean {
  try {
    assertClinicHasFeatureOrThrow(clinic, feature);
    return true;
  } catch {
    return false;
  }
}
