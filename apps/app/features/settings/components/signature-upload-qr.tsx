"use client";

import {
  useGenerateSignatureToken,
  useActiveSignatureTokens,
  useRevokeSignatureToken,
} from "@/hooks/api/use-signature-upload";
import { QrSignatureUpload } from "@/features/settings/components/shared/qr-signature-upload";
import { logger } from "@/lib/logger";

export function SignatureUploadQR() {
  const generateToken = useGenerateSignatureToken();
  const { data: activeTokens = [] } = useActiveSignatureTokens();
  const revokeToken = useRevokeSignatureToken();

  return (
    <QrSignatureUpload
      onGenerate={async () => {
        try {
          return await generateToken.mutateAsync();
        } catch (error) {
          logger.error("Failed to generate token", { error });
          throw error;
        }
      }}
      isGenerating={generateToken.isPending}
      activeTokens={activeTokens}
      onRevoke={async (tokenId) => {
        try {
          await revokeToken.mutateAsync({ tokenId });
        } catch (error) {
          logger.error("Failed to revoke token", { error });
          throw error;
        }
      }}
      isRevoking={revokeToken.isPending}
      title="Digital Signature"
      description="Upload your signature to include it in prescriptions and medical documents."
      alertText="Generate a QR code to upload your signature from your mobile device. The link expires in 15 minutes for security."
      buttonLabel="Generate Upload Link"
      dialogTitle="Upload Signature via Mobile"
      dialogDescription="Scan this QR code with your phone camera to upload your signature. The link expires in 15 minutes."
    />
  );
}
