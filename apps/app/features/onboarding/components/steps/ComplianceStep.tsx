"use client";

import type { UseFormReturn } from "react-hook-form";
import { ShieldCheck } from "lucide-react";
import type { ComplianceSettings } from "@/features/onboarding/components/types";
import {
  OnboardingStepBody,
  OnboardingStepCard,
  OnboardingStepFooter,
  OnboardingStepHeader,
} from "@/features/onboarding/components/shared";
import { DPDPSection } from "./compliance/DPDPSection";
import { SignaturesSection } from "./compliance/SignaturesSection";
import { CompliancePoliciesSection } from "./compliance/CompliancePoliciesSection";
import { useComplianceStep } from "./compliance/use-compliance-step";

interface ComplianceStepProps {
  complianceForm: UseFormReturn<ComplianceSettings>;
  onBack: () => void;
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  onboardingId?: string;
  ensureOnboardingId?: (options?: { forceRefresh?: boolean }) => Promise<string>;
  clinicId?: string;
}

export function ComplianceStep({
  complianceForm,
  onBack,
  onSubmit,
  onboardingId,
  ensureOnboardingId,
}: ComplianceStepProps) {
  const {
    activeLegalDoc,
    setActiveLegalDoc,
    signatureSessionId,
    hasOnboardingContext,
    signatureFileUrl,
    signaturePreviewFailed,
    signaturePreviewLoading,
    setSignaturePreviewFailed,
    qrFlow,
    handleResign,
    handleManualStatusRefresh,
    handleCopyQrLink,
    legalDocs,
    acceptedCount,
  } = useComplianceStep({ complianceForm, onboardingId, ensureOnboardingId });

  const checklist = [
    { label: "SLA signature uploaded", done: !!signatureSessionId },
    ...legalDocs.map((d) => ({ label: `${d.title} accepted`, done: d.accepted })),
  ];
  const isReady = checklist.every((c) => c.done);
  const pendingItems = checklist.filter((c) => !c.done);
  const isSubmitting = complianceForm.formState.isSubmitting;

  return (
    <OnboardingStepCard>
      <OnboardingStepHeader
        stepNumber={5}
        eyebrow="Compliance"
        icon={<ShieldCheck strokeWidth={1.5} />}
        title="Compliance & legal"
        description="Capture your SLA signature and accept the legal agreements to finish registration."
      />
      <OnboardingStepBody>
        <form id="step5" onSubmit={onSubmit} noValidate className="space-y-6">
          <DPDPSection complianceForm={complianceForm} />

          <SignaturesSection
            complianceForm={complianceForm}
            hasOnboardingContext={hasOnboardingContext}
            qrFlow={qrFlow}
            signatureFileUrl={signatureFileUrl}
            signaturePreviewFailed={signaturePreviewFailed}
            signaturePreviewLoading={signaturePreviewLoading}
            onSetSignaturePreviewFailed={setSignaturePreviewFailed}
            onRefreshStatus={handleManualStatusRefresh}
            onCopyLink={handleCopyQrLink}
            onResign={handleResign}
          />

          <CompliancePoliciesSection
            complianceForm={complianceForm}
            activeLegalDoc={activeLegalDoc}
            setActiveLegalDoc={setActiveLegalDoc}
            legalDocs={legalDocs}
            acceptedCount={acceptedCount}
          />
        </form>
      </OnboardingStepBody>

      <OnboardingStepFooter
        back={{ label: "Back to plan", onClick: onBack }}
        extra={
          pendingItems.length > 0 && !isSubmitting ? (
            <div className="w-full space-y-1 rounded-md border border-border/60 bg-muted/30 p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Complete before registering:
              </p>
              {pendingItems.map((item) => (
                <p
                  key={item.label}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                  {item.label}
                </p>
              ))}
            </div>
          ) : undefined
        }
        primary={{
          label: "Complete registration",
          loadingLabel: "Creating clinic…",
          form: "step5",
          type: "submit",
          disabled: !isReady,
          loading: isSubmitting,
        }}
      />
    </OnboardingStepCard>
  );
}
