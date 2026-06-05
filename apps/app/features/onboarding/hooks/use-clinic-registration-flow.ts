"use client";

import { useAuth } from "@/lib/auth/auth-context";
import { useClinicRegistrationFieldActions } from "./use-clinic-registration-field-actions";
import { useClinicRegistrationState } from "./use-clinic-registration-state";
import { useOnboardingIdActions } from "./use-onboarding-id-actions";
import { usePlanSelectionAction } from "./use-plan-selection-action";
import { useSubmitRegistrationAction } from "./use-submit-registration-action";

export function useClinicRegistrationFlow() {
  const { user, refreshUser } = useAuth();
  const {
    step,
    setStep,
    onboardingId,
    setOnboardingId,
    validatedOnboardingIdRef,
    formData,
    setFormData,
    restartOnboarding,
  } = useClinicRegistrationState();
  const idActions = useOnboardingIdActions({
    onboardingId,
    setOnboardingId,
    validatedOnboardingIdRef,
  });
  const planAction = usePlanSelectionAction({
    clinicDetails: formData.clinicDetails,
    ensureOnboardingId: idActions.ensureOnboardingId,
    setFormData,
    setStep,
    user: user ?? undefined,
  });
  const submitRegistration = useSubmitRegistrationAction({
    ensureOnboardingId: idActions.ensureOnboardingId,
    formData,
    refreshUser: async () => {
      await refreshUser();
    },
    restartOnboarding,
    setStep,
    user: user ?? undefined,
  });
  const fieldActions = useClinicRegistrationFieldActions({
    ensureOnboardingId: idActions.ensureOnboardingId,
    setFormData,
    setStep,
  });

  return {
    step,
    setStep,
    formData,
    onboardingId,
    restoreOnboardingId: setOnboardingId,
    ...fieldActions,
    ...planAction,
    submitRegistration,
    ...idActions,
    restartOnboarding,
  };
}
