import { apiFetch, getAuthHeaders } from "@/lib/api/api-client";
import {
  onboardingTrialEligibilityResponseSchema,
  type PlanMode,
} from "@workspace/types";

interface OnboardingIdResponse {
  onboardingId: string;
}

interface UploadSessionCredentials {
  id: string;
  uploadSecret: string;
}

interface CompleteOnboardingResponse {
  success?: boolean;
  message?: string;
  errors?: string[];
  access_token?: string;
  user?: unknown;
}

interface OnboardingCheckoutResponse {
  orderId: string;
  amountCents: number;
  currency: string;
  razorpayKeyId: string;
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

export function createSlaSignatureSession(
  onboardingId: string,
): Promise<UploadSessionCredentials> {
  return apiFetch(`/onboarding/${onboardingId}/sla-signature-session`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({}),
  });
}

export function completeOnboarding(
  onboardingId: string,
  payload: unknown,
): Promise<CompleteOnboardingResponse> {
  return apiFetch<CompleteOnboardingResponse>(
    `/onboarding/${onboardingId}/complete`,
    {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify(payload),
    },
  );
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

export function createOnboardingCheckout(params: {
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
  return apiFetch<OnboardingCheckoutResponse>(
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
}
