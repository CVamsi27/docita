import {
  uploadSessionContractResponseSchema,
  slaSignatureSessionStatusResponseSchema,
  type SlaSignatureSessionStatusResponse,
} from "@workspace/types";

import { api } from "@/lib/api/api-client";

/**
 * All three routes here are `@Public()` — the link arrives in an onboarding
 * email with no session to authenticate — which is why every one of them
 * returned a hand-written type:
 *
 *   fetchSlaSignatureSessionStatus(): Promise<SignatureSessionStatus> // 3 optional fields
 *   uploadSlaSignatureSession(): Promise<unknown>
 *
 * Three optional fields meant `{}` satisfied the status type, so a status
 * endpoint that stopped answering would have read as "not uploaded yet" forever
 * rather than failing. The server had its own inline copy of the same three
 * fields. All three responses now come from the shared contracts.
 */
export function uploadSlaSignatureSession(params: {
  onboardingId: string;
  sessionId: string;
  uploadSecret: string;
  file: File;
}) {
  const body = new FormData();
  body.append("file", params.file);
  return api.validate(
    `/onboarding/${params.onboardingId}/sla-signature-session/${params.sessionId}`,
    uploadSessionContractResponseSchema,
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
): Promise<SlaSignatureSessionStatusResponse> {
  return api.validate(
    `/onboarding/${onboardingId}/sla-signature-session/${sessionId}/status?ts=${ts}`,
    slaSignatureSessionStatusResponseSchema,
    { method: "GET", cache: "no-store" },
  );
}