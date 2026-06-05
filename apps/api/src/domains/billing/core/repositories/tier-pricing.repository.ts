import { ClinicTier, TierPricing } from '@workspace/db';

export const TIER_PRICING_REPOSITORY_TOKEN = Symbol('ITierPricingRepository');

export interface ITierPricingRepository {
  findManyActive(): Promise<TierPricing[]>;
  findByTier(tier: ClinicTier): Promise<TierPricing | null>;
}
