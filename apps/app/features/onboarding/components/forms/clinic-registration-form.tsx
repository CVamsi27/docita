"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle } from "lucide-react";
import { getUserFacingErrorMessage } from "@workspace/utils";
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
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { DEFAULT_COUNTRY_CODE, getFacilityLabel } from "@workspace/utils";

import {
  DRAFT_KEY,
  getMissingClinicDetailsForProgress,
} from "./clinic-registration-form-helpers";
import { useOnboardingDraft } from "./use-onboarding-draft";
import {
  DraftRestoreDialog,
  OnboardingProgressCard,
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

  const handleSetPlanSelection = async (
    tier: string,
    billingCycle: "MONTHLY" | "YEARLY",
    pricing: { monthly: number | "custom"; yearly: number | "custom" },
    options?: {
      currency?: string;
    },
  ) => {
    setStepError(null);

    const price = billingCycle === "YEARLY" ? pricing.yearly : pricing.monthly;
    const clinicGstin = clinicForm.getValues("gstin");
    const isIndianCurrency = currency === "INR";
    const isPaidPlan = typeof price === "number" && price > 0;

    if (isIndianCurrency && isPaidPlan && !clinicGstin?.trim()) {
      setStepError(
        "Add your GSTIN in Facility Details before charging a paid Indian plan. We need it for GST invoices.",
      );
      return;
    }

    try {
      await setPlanSelection(
        tier,
        billingCycle,
        pricing as PlanSelection["billingCycle"] extends "MONTHLY" | "YEARLY"
          ? { monthly: number | "custom"; yearly: number | "custom" }
          : never,
        { ...options, currency },
      );
    } catch (error) {
      setStepError(
        getUserFacingErrorMessage(error, {
          fallback:
            "We could not continue with this plan right now. Please try again.",
          context: "save",
        }),
      );
    }
  };

  const handleSetTeamMembers = async (
    members: Parameters<typeof setTeamMembers>[0],
  ) => {
    setStepError(null);
    try {
      await setTeamMembers(members);
    } catch (error) {
      setStepError(
        getUserFacingErrorMessage(error, {
          fallback: "We could not continue setup. Please try again.",
          context: "save",
        }),
      );
    }
  };

  const handleSkipTeamStep = async () => {
    setStepError(null);
    try {
      await setTeamMembers([]);
    } catch (error) {
      setStepError(
        getUserFacingErrorMessage(error, {
          fallback: "We could not continue setup. Please try again.",
          context: "save",
        }),
      );
    }
  };

  const handleSubmitRegistration = async (
    data: ComplianceSettings,
    successCallback: () => void,
  ) => {
    setStepError(null);
    try {
      await submitRegistration(data, successCallback);
    } catch (error) {
      setStepError(
        getUserFacingErrorMessage(error, {
          fallback:
            "We could not complete setup. Please check your details and try again.",
          context: "form",
        }),
      );
    }
  };

  // Guard: restart if required clinic data is missing while past step 1
  useEffect(() => {
    if (step <= 1) return;
    const missingClinicData = getMissingClinicDetailsForProgress(
      formData.clinicDetails,
    );
    if (missingClinicData.length === 0) return;

    restartOnboarding();
    localStorage.removeItem(DRAFT_KEY);
    setStepError(
      `Onboarding progress was incomplete (${missingClinicData.join(", ")}), so we started over from Step 1`,
    );
  }, [formData.clinicDetails, restartOnboarding, step]);

  return (
    <div className="space-y-6">
      <DraftRestoreDialog
        open={showDraftDialog}
        onOpenChange={setShowDraftDialog}
        savedAt={savedDraft?.savedAt}
        onDiscard={handleDiscardDraft}
        onRestore={handleRestoreDraft}
      />

      {stepError && (
        <Alert
          variant="destructive"
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{stepError}</span>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => setStepError(null)}
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {stepError ? `Error: ${stepError}` : ""}
      </div>

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
        <PlanSelectionStep
          currency={currency}
          defaultTier={formData.planSelection.tier}
          defaultBillingCycle={formData.planSelection.billingCycle}
          onSelect={handleSetPlanSelection}
        />
      )}

      {step === 4 && (
        <TeamInviteStep
          onSkip={handleSkipTeamStep}
          onComplete={handleSetTeamMembers}
          ownerName={user?.name}
          ownerEmail={user?.email}
          ownerRole={user?.role === "ADMIN_DOCTOR" ? "ADMIN_DOCTOR" : "ADMIN"}
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
