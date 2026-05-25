"use client";

import { ShieldCheck } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { PageTransitionLoader } from "@/components/loaders/page-transition-loader";
import { PreDashboardShell } from "@/features/auth/components/PreDashboardShell";
import { useVerifyDoctor } from "@/features/onboarding/hooks/use-verify-doctor";
import { buildVerificationSteps } from "./verify-doctor/helpers";
import { ProgressCard } from "./verify-doctor/progress-card";
import { SignatureStep } from "./verify-doctor/signature-step";
import { RegistrationStep } from "./verify-doctor/registration-step";

export default function VerifyDoctorPage() {
  const v = useVerifyDoctor();

  if (v.isRedirecting) {
    return (
      <PageTransitionLoader
        title="Redirecting to your workspace…"
        description="Finalizing your verification state"
      />
    );
  }

  if (v.isInitialLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-background px-4"
        role="status"
        aria-live="polite"
        aria-label="Loading doctor verification"
      >
        <DocitaLoadingIndicator
          variant="section"
          withStatusRole={false}
          iconClassName="h-10 w-10 text-muted-foreground"
        />
      </div>
    );
  }

  const steps = buildVerificationSteps({
    hasSignature: v.hasSignature,
    hasRegistrationProgress: v.hasRegistrationProgress,
  });

  return (
    <PreDashboardShell currentStep="verify-doctor" contentMaxWidth="max-w-lg">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="ui-page-title">Profile Verification</h1>
        </div>
        <p className="ui-page-subtitle">
          Complete your profile before accessing your workspace. This ensures
          patient safety and regulatory compliance.
        </p>
      </div>

      <div className="space-y-4">
        <ProgressCard steps={steps} />

        <SignatureStep
          hasSignature={v.hasSignature}
          resolvedProfileSignatureUrl={v.resolvedProfileSignatureUrl}
          canUseOnboardingSignature={v.canUseOnboardingSignature}
          resolvedOnboardingSignatureUrl={v.resolvedOnboardingSignatureUrl}
          isApplyingOnboardingSignature={v.isApplyingOnboardingSignature}
          signatureQrFlow={v.signatureQrFlow}
          onUseOnboardingSignature={() => void v.handleUseOnboardingSignature()}
        />

        <RegistrationStep
          hasRegistrationProgress={v.hasRegistrationProgress}
          hasSavedRegistration={v.hasSavedRegistration}
          profile={v.profile}
          registrationNumber={v.registrationNumber}
          setRegistrationNumber={v.setRegistrationNumber}
          registrationCouncil={v.registrationCouncil}
          setRegistrationCouncil={v.setRegistrationCouncil}
          registrationStateCode={v.registrationStateCode}
          setRegistrationStateCode={v.setRegistrationStateCode}
          registrationError={v.registrationError}
          setRegistrationError={v.setRegistrationError}
          isSavingReg={v.isSavingReg}
          onSave={() => void v.handleSaveRegistration()}
        />

        <div className="space-y-2">
          <Button
            className="w-full h-11"
            disabled={!v.canContinue || v.isSavingReg}
            onClick={() => void v.handleContinue()}
          >
            {!v.hasSavedRegistration && v.hasDraftRegistration
              ? "Register and continue"
              : "Continue to your workspace"}
          </Button>
          {!v.canContinue && (
            <p className="text-center text-xs text-muted-foreground">
              Complete all required steps to continue.
            </p>
          )}
        </div>
      </div>
    </PreDashboardShell>
  );
}
