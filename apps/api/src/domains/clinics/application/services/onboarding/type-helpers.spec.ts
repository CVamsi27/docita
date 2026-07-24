import {
  getClinicSettings,
  isTrialEligibleTier,
  validateBillingCycle,
  validateClinicTier,
  validateSpecializationForOnboarding,
} from './type-helpers';

describe('type-helpers (re-export barrel)', () => {
  it('exports getClinicSettings as a function', () => {
    expect(typeof getClinicSettings).toBe('function');
  });

  it('exports isTrialEligibleTier as a function', () => {
    expect(typeof isTrialEligibleTier).toBe('function');
  });

  it('exports validateBillingCycle as a function', () => {
    expect(typeof validateBillingCycle).toBe('function');
  });

  it('exports validateClinicTier as a function', () => {
    expect(typeof validateClinicTier).toBe('function');
  });

  it('exports validateSpecializationForOnboarding as a function', () => {
    expect(typeof validateSpecializationForOnboarding).toBe('function');
  });
});
