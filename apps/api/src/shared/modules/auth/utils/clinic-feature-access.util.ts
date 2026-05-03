import { ForbiddenException } from '@nestjs/common';
import { ClinicTier, IntelligenceAddon } from '@workspace/db';
import {
  Feature,
  FEATURE_TIER_MAP,
  isFeatureGenerallyAvailable,
  Tier,
} from '@/shared/modules/auth/auth/tier.decorator';

export type ClinicFeatureAuthSnapshot = {
  tier: ClinicTier;
  intelligenceAddon: IntelligenceAddon;
  features: unknown;
};

function mapDbTierToEnum(dbTier: ClinicTier): Tier {
  const tierMap: Record<string, Tier> = {
    [ClinicTier.STARTER]: Tier.STARTER,
    [ClinicTier.ESSENTIAL]: Tier.ESSENTIAL,
    [ClinicTier.PROFESSIONAL]: Tier.PROFESSIONAL,
    [ClinicTier.ENTERPRISE]: Tier.ENTERPRISE,
  };

  return tierMap[dbTier] ?? Tier.STARTER;
}

function getTierName(tier: Tier): string {
  const names: Record<Tier, string> = {
    [Tier.STARTER]: 'Starter',
    [Tier.ESSENTIAL]: 'Essential',
    [Tier.PROFESSIONAL]: 'Professional',
    [Tier.ENTERPRISE]: 'Enterprise',
    [Tier.INTELLIGENCE]: 'Intelligence',
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

  const userTier = mapDbTierToEnum(clinic.tier);
  if (userTier < featureTier) {
    throw new ForbiddenException(
      `This feature requires ${getTierName(featureTier)} tier or higher.`,
    );
  }
}
