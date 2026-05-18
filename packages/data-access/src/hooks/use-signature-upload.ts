import { useAPIMutation } from "../core/use-api-mutation";
import { useAPIQuery } from "../core/use-api-query";

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
    (params) =>
      `/clinics/signature/token/${params.tokenId}?clinicId=${clinicId}`,
    "DELETE",
    {
      invalidateKeys: [["clinic-signature-tokens", clinicId]],
    },
  );

