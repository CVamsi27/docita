import { completeOnboarding } from "@/features/setup/api/onboarding.api";
import { appSession } from "@/lib/auth/session";
import { RESTARTABLE_ONBOARDING_ERROR } from "./onboarding-session-storage";
import type { buildRegistrationPayload } from "./onboarding-payload";

interface RestartableOnboardingError extends Error {
  restartOnboarding?: boolean;
}

export async function completeOnboardingRegistration(
  onboardingId: string,
  payload: ReturnType<typeof buildRegistrationPayload>,
): Promise<boolean> {
  const response = await completeOnboarding(onboardingId, payload);

  if (response.success === false) {
    const raw = response.errors?.[0] ?? response.message ?? "";
    const shouldRestart = RESTARTABLE_ONBOARDING_ERROR.test(raw);
    const error: RestartableOnboardingError = new Error(
      shouldRestart
        ? "We could not finish setup. Please start again."
        : "We could not finish setup. Please try again.",
    );
    error.restartOnboarding = shouldRestart;
    throw error;
  }

  if (!response.access_token || !response.user) return false;

  appSession.setToken(response.access_token);
  return true;
}
