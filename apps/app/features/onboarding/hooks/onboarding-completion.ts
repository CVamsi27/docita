import { apiFetch } from "@/lib/api/api-client";
import { buildJsonHeaders } from "@/lib/auth/csrf";
import { appSession } from "@/lib/auth/session";
import { RESTARTABLE_ONBOARDING_ERROR } from "./onboarding-session-storage";
import type { buildRegistrationPayload } from "./onboarding-payload";

interface RestartableOnboardingError extends Error {
  restartOnboarding?: boolean;
}

interface CompleteOnboardingResponse {
  success?: boolean;
  message?: string;
  errors?: string[];
  access_token?: string;
  user?: unknown;
}

export async function completeOnboardingRegistration(
  onboardingId: string,
  payload: ReturnType<typeof buildRegistrationPayload>,
): Promise<boolean> {
  const response = await apiFetch<CompleteOnboardingResponse>(
    `/onboarding/${onboardingId}/complete`,
    {
      method: "POST",
      headers: buildJsonHeaders(),
      body: JSON.stringify(payload),
    },
  );

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

  if (!response.access_token || !response.user) {
    return false;
  }

  appSession.setToken(response.access_token);
  return true;
}
