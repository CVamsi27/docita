import { apiFetch, getAuthHeaders } from "@/lib/api/api-client";
import {
  onboardingCheckoutResponseSchema,
  onboardingCompletionResponseSchema,
  onboardingTrialEligibilityResponseSchema,
  uploadSessionCreateContractResponseSchema,
  type OnboardingCheckoutResponse,
  type OnboardingCompletionResponse,
  type PlanMode,
} from "@workspace/types";

import { api } from "@/lib/api/api-client";

interface OnboardingIdResponse {
  onboardingId: string;
}

function jsonHeaders(): Record<string, string> {
  return { "Content-Type": "application/json", ...getAuthHeaders() };
}

export function validateOnboardingProgress(onboardingId: string): Promise<void> {
  return apiFetch(`/onboarding/${onboardingId}/progress`, {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
  });
}

export async function initializeOnboarding(): Promise<string> {
  const data = await apiFetch<OnboardingIdResponse>("/onboarding/initialize", {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({}),
  });
  return data.onboardingId;
}

/**
 * `UploadSessionCredentials` used to be a second hand-written copy of this
 * response (the other lived in `@/lib/api/upload-session`), declaring only
 * `id` and `uploadSecret` and checking nothing. The contract also carries
 * `expiresAt`, which is what tells a caller the 20-minute link has lapsed.
 */
export function createSlaSignatureSession(onboardingId: string) {
  return api.validate(
    `/onboarding/${onboardingId}/sla-signature-session`,
    uploadSessionCreateContractResponseSchema,
    {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({}),
    },
  );
}

export async function completeOnboarding(
  onboardingId: string,
  payload: unknown,
): Promise<OnboardingCompletionResponse> {
  const response = await apiFetch<unknown>(
    `/onboarding/${onboardingId}/complete`,
    {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify(payload),
    },
  );
  return onboardingCompletionResponseSchema.parse(response);
}

export async function getOnboardingTrialEligibility(
  onboardingId: string,
): Promise<boolean> {
  const response = await apiFetch<unknown>(
    `/onboarding/${onboardingId}/trial-eligibility`,
    {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({}),
    },
  );
  return onboardingTrialEligibilityResponseSchema.parse(response).eligible;
}

export async function createOnboardingCheckout(params: {
  onboardingId: string;
  tier: string;
  billingCycle: "MONTHLY" | "YEARLY";
  currency: string;
  planMode: PlanMode;
  gstin?: string;
  customerEmail: string;
  customerName?: string | null;
  customerPhone?: string;
}): Promise<OnboardingCheckoutResponse> {
  const response = await apiFetch<unknown>(
    `/onboarding/${params.onboardingId}/checkout`,
    {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({
        tier: params.tier,
        billingCycle: params.billingCycle,
        currency: params.currency,
        planMode: params.planMode,
        gstin: params.gstin,
        customerEmail: params.customerEmail,
        customerName: params.customerName,
        customerPhone: params.customerPhone,
      }),
    },
  );
  return onboardingCheckoutResponseSchema.parse(response);
}
