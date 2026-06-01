import { OnboardingStep } from '@workspace/db';

interface UserOnboardingState {
  clinicId: string | null;
  onboardingStep?: OnboardingStep | null;
}

/**
 * A clinic association is the durable workspace boundary. Keep auth responses
 * compatible with legacy rows while the database backfill reaches production.
 */
export function resolveOnboardingStepForAuth(
  user: UserOnboardingState,
): OnboardingStep | undefined {
  if (user.clinicId) {
    return OnboardingStep.COMPLETED;
  }

  return user.onboardingStep ?? undefined;
}
