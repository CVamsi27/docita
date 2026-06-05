"use client";

import type { UseFormReturn } from "react-hook-form";
import { PenLine } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import Image from "next/image";
import { PhoneSignatureQrPanel } from "@/components/signature/phone-signature-qr-panel";
import type { usePhoneSignatureQrFlow } from "@/hooks/use-phone-signature-qr-flow";
import { OnboardingSection } from "@/features/onboarding/components/shared";
import type { ComplianceSettings } from "@/features/onboarding/components/types";

interface SignaturesSectionProps {
  complianceForm: UseFormReturn<ComplianceSettings>;
  hasOnboardingContext: boolean;
  qrFlow: ReturnType<typeof usePhoneSignatureQrFlow>;
  signatureFileUrl: string | null;
  signaturePreviewFailed: boolean;
  signaturePreviewLoading: boolean;
  onSetSignaturePreviewFailed: (v: boolean) => void;
  onRefreshStatus: () => Promise<void>;
  onCopyLink: () => Promise<void>;
  onResign: () => Promise<void>;
}

export function SignaturesSection({
  complianceForm,
  hasOnboardingContext,
  qrFlow,
  signatureFileUrl,
  signaturePreviewFailed,
  signaturePreviewLoading,
  onSetSignaturePreviewFailed,
  onRefreshStatus,
  onCopyLink,
  onResign,
}: SignaturesSectionProps) {
  return (
    <OnboardingSection title="SLA signature" icon={<PenLine />}>
      <PhoneSignatureQrPanel
        loading={qrFlow.isLoading}
        uploaded={qrFlow.isUploaded}
        polling={qrFlow.isPolling}
        error={qrFlow.error}
        qrUrl={qrFlow.session?.qrUrl ?? null}
        onRetry={() => {
          void qrFlow.retrySession();
        }}
        onRefreshStatus={onRefreshStatus}
        onCopyLink={onCopyLink}
        missingContextMessage={
          !hasOnboardingContext
            ? "Missing onboarding session ID for QR signature. Go back one step and continue once to re-initialize."
            : undefined
        }
        successTitle="Signature received from your phone"
        successDescription="Your signature has been saved successfully"
      />
      {qrFlow.isUploaded ? (
        <div className="ui-card-surface space-y-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="ui-section-title text-[var(--fs-sm)]">
              Signature preview
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                void onResign();
              }}
            >
              Edit / Re-sign
            </Button>
          </div>
          {signaturePreviewLoading ? (
            <p className="text-xs text-muted-foreground">
              Loading signature preview…
            </p>
          ) : signatureFileUrl && !signaturePreviewFailed ? (
            <div className="rounded-md border bg-white p-3">
              <Image
                src={signatureFileUrl}
                alt="SLA signature preview"
                width={700}
                height={260}
                className="h-auto w-full max-w-full"
                unoptimized
                onError={() => {
                  onSetSignaturePreviewFailed(true);
                }}
              />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              We received your signature, but the preview is not available yet.
              You can continue, or re-sync to try again.
            </p>
          )}
        </div>
      ) : null}
      {complianceForm.formState.errors.slaSignatureSessionId && (
        <p className="text-sm text-destructive">
          {complianceForm.formState.errors.slaSignatureSessionId.message}
        </p>
      )}
    </OnboardingSection>
  );
}
