"use client";

import { useGenerateSlaSignatureToken, useClinicActiveSignatureTokens, useRevokeClinicSignatureToken } from "@workspace/data-access";
import { QrSignatureUpload } from "@/features/settings/components/shared/qr-signature-upload";

interface ClinicSlaSignatureQRProps {
  clinicId: string;
}

export function ClinicSlaSignatureQR({ clinicId }: ClinicSlaSignatureQRProps) {
  const generateToken = useGenerateSlaSignatureToken(clinicId);
  const { data: activeTokens = [] } = useClinicActiveSignatureTokens(clinicId);
  const revokeToken = useRevokeClinicSignatureToken(clinicId);

  return (
    <QrSignatureUpload
      onGenerate={() => generateToken.mutateAsync()}
      isGenerating={generateToken.isPending}
      activeTokens={activeTokens}
      onRevoke={async (tokenId) => {
        await revokeToken.mutateAsync({ tokenId });
      }}
      isRevoking={revokeToken.isPending}
      alertText="Generate a QR code to upload the SLA signature from a mobile device. The link expires in 15 minutes for security."
      buttonLabel="Generate SLA Signature Upload Link"
      dialogTitle="Upload SLA Signature via Mobile"
      dialogDescription="Scan this QR code with your phone camera to upload the SLA signature. The link expires in 15 minutes."
    />
  );
}
