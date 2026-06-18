"use client";

import type { OnboardingData } from "@/features/onboarding/schemas/onboarding.schemas";
import { apiFetch } from "@/lib/api/api-client";
import { buildCsrfHeaders, buildJsonHeaders } from "@/lib/auth/csrf";
import {
  onboardingTrialEligibilityResponseSchema,
  type PlanMode,
} from "@workspace/types";

export interface OnboardingIdResponse {
  onboardingId: string;
}

export interface UploadSessionCredentials {
  id: string;
  uploadSecret: string;
}

export interface SignatureSessionStatus {
  status?: string;
  uploaded?: boolean;
  fileUrl?: string | null;
}

export interface CompleteOnboardingResponse {
  success?: boolean;
  message?: string;
  errors?: string[];
  access_token?: string;
  user?: unknown;
}

export interface OnboardingCheckoutResponse {
  orderId: string;
  amountCents: number;
  currency: string;
  razorpayKeyId: string;
}

export function registerOnboarding(data: Partial<OnboardingData>) {
  return apiFetch("/onboarding/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function validateOnboardingProgress(onboardingId: string): Promise<void> {
  return apiFetch(`/onboarding/${onboardingId}/progress`, {
    method: "GET",
    headers: buildJsonHeaders(),
    cache: "no-store",
  });
}

export async function initializeOnboarding(): Promise<string> {
  const data = await apiFetch<OnboardingIdResponse>(
    "/onboarding/initialize",
    { method: "POST", headers: buildJsonHeaders(), body: JSON.stringify({}) },
  );
  return data.onboardingId;
}

export function createSlaSignatureSession(
  onboardingId: string,
): Promise<UploadSessionCredentials> {
  return apiFetch(`/onboarding/${onboardingId}/sla-signature-session`, {
    method: "POST",
    headers: buildJsonHeaders(),
    body: JSON.stringify({}),
  });
}

export function uploadSlaSignatureSession(params: {
  onboardingId: string;
  sessionId: string;
  uploadSecret: string;
  file: File;
}): Promise<unknown> {
  const body = new FormData();
  body.append("file", params.file);
  return apiFetch(
    `/onboarding/${params.onboardingId}/sla-signature-session/${params.sessionId}`,
    {
      method: "POST",
      headers: buildCsrfHeaders({
        "X-Upload-Secret": params.uploadSecret,
      }),
      body,
    },
  );
}

export function fetchSlaSignatureSessionStatus(
  onboardingId: string,
  sessionId: string,
  ts = Date.now(),
): Promise<SignatureSessionStatus> {
  return apiFetch<SignatureSessionStatus>(
    `/onboarding/${onboardingId}/sla-signature-session/${sessionId}/status?ts=${ts}`,
    { method: "GET", cache: "no-store" },
  );
}

export function completeOnboarding(
  onboardingId: string,
  payload: unknown,
): Promise<CompleteOnboardingResponse> {
  return apiFetch<CompleteOnboardingResponse>(
    `/onboarding/${onboardingId}/complete`,
    {
      method: "POST",
      headers: buildJsonHeaders(),
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
      headers: buildJsonHeaders(),
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
      headers: buildJsonHeaders(),
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
