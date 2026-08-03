import type { UploadResult } from "@workspace/data-access";
import { apiFetch } from "@/lib/api/api-client";

export interface ValidateTokenResult {
  tokenId: string;
  purpose: string;
  doctor: {
    id: string;
    name: string;
    email: string;
    signatureUrl: string | null;
    signatureStoredUrl?: string | null;
  } | null;
  clinic: {
    id: string;
    name: string;
    slaSignatureUrl: string | null;
    slaSignatureStoredUrl?: string | null;
  } | null;
}

export const uploadSignature = async (
  token: string,
  file: File,
  purpose: "doctor" | "sla" = "doctor",
): Promise<UploadResult> => {
  const formData = new FormData();
  formData.append("file", file);

  const endpoint =
    purpose === "sla"
      ? `/clinics/signature/upload/${token}`
      : `/doctors/signature/upload/${token}`;

  return await apiFetch<UploadResult>(endpoint, {
    method: "POST",
    body: formData,
    suppressGlobalErrorToast: true,
  });
};

export const validateToken = async (token: string) =>
  apiFetch<ValidateTokenResult>(`/doctors/signature/validate-token/${token}`, {
    suppressGlobalErrorToast: true,
  });
