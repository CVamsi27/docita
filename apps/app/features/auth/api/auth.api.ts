"use client";

import { api, apiFetch } from "@/lib/api/api-client";

export function requestPasswordReset(email: string): Promise<unknown> {
  return api.post("/auth/forgot-password", { email });
}

export function resetPassword(params: {
  token: string;
  newPassword: string;
}): Promise<unknown> {
  return api.post("/auth/reset-password", params);
}

export function resendVerificationEmail(): Promise<unknown> {
  return apiFetch("/auth/resend-verification", { method: "POST" });
}
