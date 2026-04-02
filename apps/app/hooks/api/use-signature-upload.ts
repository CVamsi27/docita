import { useAPIMutation, useAPIQuery, fetchAPI } from "@/lib/api-core";

export interface SignatureUploadToken {
  token: string;
  expiresAt: Date;
  uploadUrl: string;
}

export interface ActiveToken {
  id: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  purpose?: string;
}

export interface UploadResult {
  success: boolean;
  signatureUrl: string;
  purpose: string;
  doctor?: { id: string; name: string };
  clinic?: { id: string; name: string };
}

// Doctor prescription signature token
export const useGenerateSignatureToken = () =>
  useAPIMutation<SignatureUploadToken, void>(
    "/doctors/signature/generate-token",
    "POST",
    {
      invalidateKeys: [["signature-tokens"]],
    },
  );

export const useActiveSignatureTokens = () =>
  useAPIQuery<ActiveToken[]>(
    ["signature-tokens"],
    "/doctors/signature/active-tokens",
  );

export const useRevokeSignatureToken = () =>
  useAPIMutation<{ success: boolean }, { tokenId: string }>(
    (params) => `/doctors/signature/token/${params.tokenId}`,
    "DELETE",
    {
      invalidateKeys: [["signature-tokens"]],
    },
  );

// Clinic SLA signature token
export const useGenerateSlaSignatureToken = (clinicId: string) =>
  useAPIMutation<SignatureUploadToken, void>(
    `/clinics/signature/generate-token?clinicId=${clinicId}`,
    "POST",
    {
      invalidateKeys: [["clinic-signature-tokens", clinicId]],
    },
  );

export const useClinicActiveSignatureTokens = (clinicId: string) =>
  useAPIQuery<ActiveToken[]>(
    ["clinic-signature-tokens", clinicId],
    `/clinics/signature/active-tokens?clinicId=${clinicId}`,
    { enabled: !!clinicId },
  );

export const useRevokeClinicSignatureToken = (clinicId: string) =>
  useAPIMutation<{ success: boolean }, { tokenId: string }>(
    (params) => `/clinics/signature/token/${params.tokenId}?clinicId=${clinicId}`,
    "DELETE",
    {
      invalidateKeys: [["clinic-signature-tokens", clinicId]],
    },
  );

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

  return await fetchAPI<UploadResult>(endpoint, {
    method: "POST",
    body: formData,
  });
};

export const validateToken = async (token: string) => {
  return fetchAPI<{
    tokenId: string;
    purpose: string;
    doctor: {
      id: string;
      name: string;
      email: string;
      signatureUrl: string | null;
    } | null;
    clinic: {
      id: string;
      name: string;
      slaSignatureUrl: string | null;
    } | null;
  }>(`/doctors/signature/validate-token/${token}`);
};
