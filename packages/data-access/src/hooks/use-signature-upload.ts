import { useAPIMutation, useAPIQuery, fetchAPI } from "@/lib/api/api-core";

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
  signatureStoredUrl?: string;
  purpose: string;
  doctor?: { id: string; name: string };
  clinic?: { id: string; name: string };
}

export const useGenerateSignatureToken = () =>
  useAPIMutation<SignatureUploadToken, void>(
    "/doctors/signature/generate-token",
    "POST",
    {
      invalidateKeys: [queryKeys.signatures.tokens()],
    },
  );

export const useActiveSignatureTokens = () =>
  useAPIQuery<ActiveToken[]>(
    queryKeys.signatures.tokens(),
    "/doctors/signature/active-tokens",
  );

export const useRevokeSignatureToken = () =>
  useAPIMutation<{ success: boolean }, { tokenId: string }>(
    (params) => `/doctors/signature/token/${params.tokenId}`,
    "DELETE",
    {
      invalidateKeys: [queryKeys.signatures.tokens()],
    },
  );

export const useGenerateSlaSignatureToken = (clinicId: string) =>
  useAPIMutation<SignatureUploadToken, void>(
    `/clinics/signature/generate-token?clinicId=${clinicId}`,
    "POST",
    {
      invalidateKeys: [queryKeys.signatures.clinicTokens(clinicId)],
    },
  );

export const useClinicActiveSignatureTokens = (clinicId: string) =>
  useAPIQuery<ActiveToken[]>(
    queryKeys.signatures.clinicTokens(clinicId),
    `/clinics/signature/active-tokens?clinicId=${clinicId}`,
    { enabled: !!clinicId },
  );

export const useRevokeClinicSignatureToken = (clinicId: string) =>
  useAPIMutation<{ success: boolean }, { tokenId: string }>(
    (params) =>
      `/clinics/signature/token/${params.tokenId}?clinicId=${clinicId}`,
    "DELETE",
    {
      invalidateKeys: [queryKeys.signatures.clinicTokens(clinicId)],
    },
  );

