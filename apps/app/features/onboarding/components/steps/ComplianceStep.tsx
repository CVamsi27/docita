"use client";

import type { UseFormReturn } from "react-hook-form";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import type { ComplianceSettings } from "@/features/onboarding/components/types";
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 4: Compliance and Legal</CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>

      <CardFooter className="flex flex-col gap-4">
        {pendingItems.length > 0 && !complianceForm.formState.isSubmitting && (
          <div className="w-full rounded-md border border-muted bg-muted/30 p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Complete before registering:</p>
            {pendingItems.map((item) => (
              <p key={item.label} className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
                {item.label}
              </p>
            ))}
          </div>
        )}
        <div className="flex w-full justify-between gap-4">
          <Button variant="outline" onClick={onBack}>Back</Button>
          <Button
            className="flex-1"
            form="step5"
            type="submit"
            disabled={complianceForm.formState.isSubmitting || !isReady}
          >
            {complianceForm.formState.isSubmitting ? "Creating Clinic…" : "Complete Registration"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
