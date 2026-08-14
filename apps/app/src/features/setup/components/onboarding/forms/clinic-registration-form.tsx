"use client";

import { useAuth } from "@/lib/auth/auth-context";
import { useLocaleCurrency } from "@/hooks/use-locale-currency";
import { ClinicDetailsStep, ClinicWeeklyHoursStep, ComplianceStep, PlanSelectionStep, TeamInviteStep } from "@/features/setup/components/onboarding/steps";
import { getFacilityLabel, recommendTierForTeamSize } from "@workspace/utils";
import { ComplianceDraftWatcher, DraftRestoreDialog, OnboardingProgressCard, StepErrorAlert, StepGuard } from "./clinic-registration-form-sections";
import { useClinicRegistrationForm } from "./use-clinic-registration-form";

export function ClinicRegistrationForm({ onSuccess }: { onSuccess: () => void }) {
  const { user } = useAuth();
  const { currency } = useLocaleCurrency();
  const h = useClinicRegistrationForm(onSuccess);

  return (
    <div className="space-y-6">
      <ComplianceDraftWatcher complianceForm={h.complianceForm} setComplianceDraft={h.setComplianceDraft} />
      <StepGuard step={h.step} formData={h.formData} restartOnboarding={h.restartOnboarding} setStepError={h.setStepError} />
      <DraftRestoreDialog open={h.showDraftDialog} onOpenChange={h.setShowDraftDialog}
        savedAt={h.savedDraft?.savedAt} onDiscard={h.handleDiscardDraft} onRestore={h.handleRestoreDraft} />
      <StepErrorAlert message={h.stepError} onDismiss={() => h.setStepError(null)} />
      <OnboardingProgressCard step={h.step} />

      {h.step === 1 && <ClinicDetailsStep clinicForm={h.clinicForm} onSubmit={h.handleSetClinicDetails} />}

      {h.step === 2 && (
        <ClinicWeeklyHoursStep initialRows={h.formData.clinicWeeklyHours}
          facilityWord={getFacilityLabel(h.formData.clinicDetails.facilityLabel ?? "CLINIC")}
          onBack={() => h.setStep(1)}
          onContinue={(rows) => { h.setStepError(null); h.setClinicWeeklyHours(rows); }} />
      )}

      {h.step === 3 && (
        <TeamInviteStep onBack={() => h.setStep(2)} onSkip={h.handleSkipTeamStep}
          onComplete={h.handleSetTeamMembers} ownerName={user?.name} ownerEmail={user?.email}
          ownerRole={user?.role === "ADMIN_DOCTOR" ? "ADMIN_DOCTOR" as const : "ADMIN" as const} />
      )}

      {h.step === 4 && (
        <PlanSelectionStep currency={currency}
          defaultTier={recommendTierForTeamSize(1 + h.formData.teamMembers.length)?.tier ?? h.formData.planSelection.tier}
          defaultBillingCycle={h.formData.planSelection.billingCycle}
          teamUserCount={1 + h.formData.teamMembers.length} onBack={() => h.setStep(3)}
          onSelect={h.handleSetPlanSelection} />
      )}

      {h.step === 5 && (
        <ComplianceStep complianceForm={h.complianceForm} onBack={h.goBackFromCompliance}
          onSubmit={h.complianceForm.handleSubmit((data) => h.handleSubmitRegistration(data, onSuccess))}
          onboardingId={h.onboardingId ?? undefined} ensureOnboardingId={h.ensureOnboardingId} />
      )}
    </div>
  );
}
