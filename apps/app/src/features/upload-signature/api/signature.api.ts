import type { UploadResult } from "@workspace/data-access";
import {
  signatureTokenValidationResponseSchema,
  type SignatureTokenValidationResponse,
} from "@workspace/types";
import { apiFetch } from "@/lib/api/api-client";

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

export const validateToken = async (
  token: string,
): Promise<SignatureTokenValidationResponse> => {
  const response = await apiFetch<unknown>(
    `/doctors/signature/validate-token/${token}`,
    { suppressGlobalErrorToast: true },
  );
  return signatureTokenValidationResponseSchema.parse(response);
};
