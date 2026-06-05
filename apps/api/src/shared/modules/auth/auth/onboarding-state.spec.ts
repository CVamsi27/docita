import { describe, expect, it } from '@jest/globals';
import { OnboardingStep } from '@workspace/db';
import { resolveOnboardingStepForAuth } from './onboarding-state';

describe('resolveOnboardingStepForAuth', () => {
  it('treats clinic-associated users as completed when persisted state is stale', () => {
    expect(
      resolveOnboardingStepForAuth({
        clinicId: 'clinic-1',
        onboardingStep: OnboardingStep.NOT_STARTED,
      }),
    ).toBe(OnboardingStep.COMPLETED);
  });

  it('preserves setup progress for users without a clinic', () => {
    expect(
      resolveOnboardingStepForAuth({
        clinicId: null,
        onboardingStep: OnboardingStep.CREATING_CLINIC,
      }),
    ).toBe(OnboardingStep.CREATING_CLINIC);
  });
});
