import { ClinicTier } from '@workspace/db';

/**
 * Plans eligible for the unpaid free trial: every published tier except
 * Enterprise, which is custom-priced and routed through sales (no self-serve
 * trial). Front Desk / Core variants of trial-eligible tiers stay eligible.
 */
export function isTrialEligibleTier(tier: ClinicTier): boolean {
  return tier !== ClinicTier.ENTERPRISE;
}
