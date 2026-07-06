import { describe, expect, it } from '@jest/globals';
import { ClinicTier } from '@workspace/db';
import { isTrialEligibleTier } from './onboarding-trial-eligibility';

describe('isTrialEligibleTier', () => {
  it('excludes only the custom-priced Enterprise tier', () => {
    expect(isTrialEligibleTier(ClinicTier.ENTERPRISE)).toBe(false);
  });

  it.each([
    ClinicTier.STARTER,
    ClinicTier.ESSENTIAL,
    ClinicTier.PROFESSIONAL,
    ClinicTier.HOSPITAL,
  ])('allows the self-serve tier %s', (tier) => {
    expect(isTrialEligibleTier(tier)).toBe(true);
  });
});
