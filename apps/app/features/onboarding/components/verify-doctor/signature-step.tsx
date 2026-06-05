"use client";

import { FC } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { toast } from "sonner";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { PhoneSignatureQrPanel } from "@/components/signature/phone-signature-qr-panel";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import type { UseVerifyDoctorReturn } from "@/features/onboarding/hooks/use-verify-doctor";

interface SignatureStepProps {
  hasSignature: boolean;
  resolvedProfileSignatureUrl: string | null;
  canUseOnboardingSignature: boolean;
  resolvedOnboardingSignatureUrl: string | null;
  isApplyingOnboardingSignature: boolean;
  signatureQrFlow: UseVerifyDoctorReturn["signatureQrFlow"];
  onUseOnboardingSignature: () => void;
}

export const SignatureStep: FC<SignatureStepProps> = ({
  hasSignature,
  resolvedProfileSignatureUrl,
  canUseOnboardingSignature,
  resolvedOnboardingSignatureUrl,
  isApplyingOnboardingSignature,
  signatureQrFlow,
  onUseOnboardingSignature,
}) => {
  return (
    <div className="ui-card-surface space-y-3 p-5">
      <div className="flex items-center gap-2">
        {hasSignature ? (
          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
        )}
        <h2 className="font-semibold text-sm">Step 1: Upload Your Signature</h2>
      </div>
      {hasSignature ? (
        <SignatureUploadedView
          resolvedProfileSignatureUrl={resolvedProfileSignatureUrl}
        />
      ) : (
        <SignaturePendingView
          canUseOnboardingSignature={canUseOnboardingSignature}
          resolvedOnboardingSignatureUrl={resolvedOnboardingSignatureUrl}
          isApplyingOnboardingSignature={isApplyingOnboardingSignature}
          signatureQrFlow={signatureQrFlow}
          onUseOnboardingSignature={onUseOnboardingSignature}
        />
      )}
    </div>
  );
};

const SignatureUploadedView: FC<{
  resolvedProfileSignatureUrl: string | null;
}> = ({ resolvedProfileSignatureUrl }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
      <CheckCircle2 className="h-4 w-4 shrink-0" />
      Signature uploaded successfully.
    </div>
    {resolvedProfileSignatureUrl && (
      <div className="flex min-h-[140px] items-center justify-center rounded-lg border bg-white p-4">
        <img
          src={resolvedProfileSignatureUrl}
          alt="Your uploaded signature"
          className="max-h-40 max-w-full object-contain"
        />
      </div>
    )}
    <p className="text-xs text-muted-foreground">
      This signature will appear on prescriptions and medical documents.
      <a
        href="/settings?tab=doctor-profile"
        className="ml-1 text-primary underline-offset-2 hover:underline"
      >
        Re-upload in Settings
      </a>
    </p>
  </div>
);

interface SignaturePendingViewProps {
  canUseOnboardingSignature: boolean;
  resolvedOnboardingSignatureUrl: string | null;
  isApplyingOnboardingSignature: boolean;
  signatureQrFlow: UseVerifyDoctorReturn["signatureQrFlow"];
  onUseOnboardingSignature: () => void;
}

const SignaturePendingView: FC<SignaturePendingViewProps> = ({
  canUseOnboardingSignature,
  resolvedOnboardingSignatureUrl,
  isApplyingOnboardingSignature,
  signatureQrFlow,
  onUseOnboardingSignature,
}) => {
  const showOnboardingReuse =
    canUseOnboardingSignature && resolvedOnboardingSignatureUrl;
  const showQrPanel =
    !canUseOnboardingSignature ||
    signatureQrFlow.session ||
    signatureQrFlow.isLoading ||
    signatureQrFlow.error;

  return (
    <div className="space-y-3">
      {showOnboardingReuse && (
        <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-primary">
                Signature uploaded during onboarding
              </p>
              <p className="text-xs text-muted-foreground">
                You can reuse the same signature for your doctor profile.
              </p>
            </div>
          </div>
          <div className="flex min-h-[140px] items-center justify-center rounded-lg border bg-white p-4">
            <img
              src={resolvedOnboardingSignatureUrl}
              alt="Onboarding signature preview"
              className="max-h-40 max-w-full object-contain"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              className="flex-1"
              onClick={onUseOnboardingSignature}
              disabled={
                isApplyingOnboardingSignature || signatureQrFlow.isLoading
              }
            >
              {isApplyingOnboardingSignature ? (
                <>
                  <DocitaLoadingIndicator
                    variant="inline"
                    decorative
                    className="mr-2"
                  />
                  Applying…
                </>
              ) : (
                "Use onboarding signature"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => void signatureQrFlow.retrySession()}
              disabled={
                isApplyingOnboardingSignature || signatureQrFlow.isLoading
              }
            >
              Use a different signature
            </Button>
          </div>
        </div>
      )}
      {showQrPanel && (
        <PhoneSignatureQrPanel
          loading={signatureQrFlow.isLoading}
          uploaded={signatureQrFlow.isUploaded}
          polling={signatureQrFlow.isPolling}
          error={signatureQrFlow.error}
          qrUrl={signatureQrFlow.session?.qrUrl ?? null}
          onRetry={() => {
            void signatureQrFlow.retrySession();
          }}
          onRefreshStatus={async () => {
            try {
              const synced = await signatureQrFlow.refreshStatus();
              if (synced) {
                toast.success("Signature synced");
              } else {
                toast.message("We have not received the signature yet");
              }
            } catch {
              showUserFacingErrorToast(
                "We could not refresh signature status. Please try again.",
              );
            }
          }}
          onCopyLink={async () => {
            try {
              const copied = await signatureQrFlow.copyLink();
              if (copied) {
                toast.success("Link copied");
              } else {
                showUserFacingErrorToast(
                  "We could not copy this link. Please try again.",
                );
              }
            } catch {
              showUserFacingErrorToast(
                "We could not copy this link. Please try again.",
              );
            }
          }}
          successTitle="Signature uploaded successfully"
          successDescription="Your signature has been saved and verified"
        />
      )}
    </div>
  );
};
