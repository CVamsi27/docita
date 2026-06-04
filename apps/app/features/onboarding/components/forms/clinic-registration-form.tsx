"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { PlanMode } from "@workspace/types";
import { useClinicRegistrationFlow } from "@/features/onboarding/hooks/use-clinic-registration-flow";
import { useAuth } from "@/lib/auth/auth-context";
import { useLocaleCurrency } from "@/hooks/use-locale-currency";
import {
  ClinicDetailsStep,
  ClinicWeeklyHoursStep,
  ComplianceStep,
  PlanSelectionStep,
  TeamInviteStep,
} from "@/features/onboarding/components/steps";
import {
  type ClinicDetails,
  clinicDetailsSchema,
  complianceSchema,
  type ComplianceSettings,
  defaultComplianceValues,
} from "@/features/onboarding/components/types";
import {
  DEFAULT_COUNTRY_CODE,
  getFacilityLabel,
  recommendTierForTeamSize,
} from "@workspace/utils";

import {
  DRAFT_KEY,
  getMissingClinicDetailsForProgress,
  withStepErrorHandling,
} from "./clinic-registration-form-helpers";
import { useOnboardingDraft } from "./use-onboarding-draft";
import {
  ComplianceDraftWatcher,
  DraftRestoreDialog,
  OnboardingProgressCard,
  StepErrorAlert,
  StepGuard,
} from "./clinic-registration-form-sections";

export function ClinicRegistrationForm({
  onSuccess,
}: {
  onSuccess: () => void;
}) {
  const { user } = useAuth();
  const { currency } = useLocaleCurrency();
  const [stepError, setStepError] = useState<string | null>(null);
  const {
    step,
    setStep,
    formData,
    onboardingId,
    restoreOnboardingId,
    ensureOnboardingId,
    restartOnboarding,
    setClinicDetails,
    setClinicWeeklyHours,
    setPlanSelection,
    setTeamMembers,
    goBackFromCompliance,
    setComplianceDraft,
    submitRegistration,
  } = useClinicRegistrationFlow();

  const clinicForm = useForm<ClinicDetails>({
    resolver: zodResolver(clinicDetailsSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    criteriaMode: "all",
    shouldFocusError: true,
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      pincode: "",
      facilityLabel: "CLINIC",
      countryCode: DEFAULT_COUNTRY_CODE,
      website: "",
      gstin: "",
      legalName: "",
      type: "GENERAL",
      ...formData.clinicDetails,
    },
  });

  const complianceForm = useForm<ComplianceSettings>({
    resolver: zodResolver(complianceSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    criteriaMode: "all",
    shouldFocusError: true,
    defaultValues: {
      ...defaultComplianceValues,
      ...formData.compliance,
    },
  });

  const {
    showDraftDialog,
    setShowDraftDialog,
    savedDraft,
    handleRestoreDraft,
    handleDiscardDraft,
  } = useOnboardingDraft({
    clinicForm,
    complianceForm,
    onboardingId,
    restoreOnboardingId,
    restartOnboarding,
    onAfterDiscard: () => setStepError(null),
  });

  const handleSetClinicDetails = (data: ClinicDetails) => {
    setStepError(null);
    setClinicDetails(data);
  };

  const handleSetPlanSelection = (
    tier: string,
    billingCycle: "MONTHLY" | "YEARLY",
    pricing: { monthly: number | "custom"; yearly: number | "custom" },
    options?: {
      currency?: string;
      mode?: PlanMode;
    },
  ) => withStepErrorHandling(
    () => setPlanSelection(tier, billingCycle, pricing, { ...options, currency }),
    setStepError,
    "We could not continue with this plan right now. Please try again.",
    "save",
  );

  const handleSetTeamMembers = (
    members: Parameters<typeof setTeamMembers>[0],
  ) => withStepErrorHandling(
    () => setTeamMembers(members),
    setStepError,
    "We could not continue setup. Please try again.",
    "save",
  );

  const handleSkipTeamStep = () => withStepErrorHandling(
    () => setTeamMembers([]),
    setStepError,
    "We could not continue setup. Please try again.",
    "save",
  );

  const handleSubmitRegistration = (
    data: ComplianceSettings,
    successCallback: () => void,
  ) => withStepErrorHandling(
    () => submitRegistration(data, successCallback),
    setStepError,
    "We could not complete setup. Please check your details and try again.",
    "form",
  );

  return (
    <div className="space-y-6">
      <ComplianceDraftWatcher
        complianceForm={complianceForm}
        setComplianceDraft={setComplianceDraft}
      />

      <StepGuard
        step={step}
        formData={formData}
        restartOnboarding={restartOnboarding}
        setStepError={setStepError}
      />

      <DraftRestoreDialog
        open={showDraftDialog}
        onOpenChange={setShowDraftDialog}
        savedAt={savedDraft?.savedAt}
        onDiscard={handleDiscardDraft}
        onRestore={handleRestoreDraft}
      />

      <StepErrorAlert
        message={stepError}
        onDismiss={() => setStepError(null)}
      />

      <OnboardingProgressCard step={step} />

      {step === 1 && (
        <ClinicDetailsStep
          clinicForm={clinicForm}
          onSubmit={handleSetClinicDetails}
        />
      )}

      {step === 2 && (
        <ClinicWeeklyHoursStep
          initialRows={formData.clinicWeeklyHours}
          facilityWord={getFacilityLabel(
            formData.clinicDetails.facilityLabel ?? "CLINIC",
          )}
          onBack={() => setStep(1)}
          onContinue={(rows) => {
            setStepError(null);
            setClinicWeeklyHours(rows);
          }}
        />
      )}

      {step === 3 && (
        <TeamInviteStep
          onBack={() => setStep(2)}
          onSkip={handleSkipTeamStep}
          onComplete={handleSetTeamMembers}
          ownerName={user?.name}
          ownerEmail={user?.email}
          ownerRole={user?.role === "ADMIN_DOCTOR" ? ("ADMIN_DOCTOR" as const) : ("ADMIN" as const)}
        />
      )}

      {step === 4 && (
        <PlanSelectionStep
          currency={currency}
          defaultTier={
            recommendTierForTeamSize(1 + formData.teamMembers.length)?.tier ??
            formData.planSelection.tier
          }
          defaultBillingCycle={formData.planSelection.billingCycle}
          teamUserCount={1 + formData.teamMembers.length}
          onBack={() => setStep(3)}
          onSelect={handleSetPlanSelection}
        />
      )}

      {step === 5 && (
        <ComplianceStep
          complianceForm={complianceForm}
          onBack={goBackFromCompliance}
          onSubmit={complianceForm.handleSubmit((data: ComplianceSettings) =>
            handleSubmitRegistration(data, onSuccess),
          )}
          onboardingId={onboardingId ?? undefined}
          ensureOnboardingId={ensureOnboardingId}
        />
      )}
    </div>
  );
}
