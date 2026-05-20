import { SetMetadata } from '@nestjs/common';
import { Tier, Feature, FEATURE_TIER_MAP } from '@workspace/types';
import { isFeatureGenerallyAvailable } from '@workspace/utils';

export { Tier, Feature, FEATURE_TIER_MAP, isFeatureGenerallyAvailable };

export const TIER_KEY = 'requiredTier';
export const FEATURE_KEY = 'requiredFeature';

export const RequireTier = (tier: Tier) => SetMetadata(TIER_KEY, tier);

export const RequireFeature = (feature: Feature) =>
  SetMetadata(FEATURE_KEY, feature);
