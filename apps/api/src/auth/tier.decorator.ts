import { SetMetadata } from '@nestjs/common';
import { Tier, Feature, FEATURE_TIER_MAP } from '@workspace/types';

// Re-export for convenience
export { Tier, Feature, FEATURE_TIER_MAP };

export const TIER_KEY = 'requiredTier';
export const FEATURE_KEY = 'requiredFeature';

/**
 * Decorator to require a minimum tier for an endpoint
 */
export const RequireTier = (tier: Tier) => SetMetadata(TIER_KEY, tier);

/**
 * Decorator to require a specific feature for an endpoint
 */
export const RequireFeature = (feature: Feature) => SetMetadata(FEATURE_KEY, feature);
