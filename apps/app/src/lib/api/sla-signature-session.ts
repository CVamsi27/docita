import { apiFetch } from "@/lib/api/api-client";

export interface SignatureSessionStatus {
  status?: string;
  uploaded?: boolean;
  fileUrl?: string | null;
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
      headers: { "X-Upload-Secret": params.uploadSecret },
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
    {
      method: "GET",
      cache: "no-store",
    },
  );
}
