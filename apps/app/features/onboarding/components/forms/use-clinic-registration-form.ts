"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { PlanMode } from "@workspace/types";
import { useClinicRegistrationFlow } from "@/features/onboarding/hooks/use-clinic-registration-flow";
import {
  type ClinicDetails,
  clinicDetailsSchema,
  complianceSchema,
  type ComplianceSettings,
  defaultComplianceValues,
} from "@/features/onboarding/components/types";
import { DEFAULT_COUNTRY_CODE } from "@workspace/utils";
import { withStepErrorHandling } from "./clinic-registration-form-helpers";
import { useOnboardingDraft } from "./use-onboarding-draft";

export function useClinicRegistrationForm(_onSuccess: () => void) {
  const flow = useClinicRegistrationFlow();
  const [stepError, setStepError] = useState<string | null>(null);

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
      abdmEnabled: false,
      type: "GENERAL",
      ...flow.formData.clinicDetails,
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
      ...flow.formData.compliance,
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
    onboardingId: flow.onboardingId,
    formData: flow.formData,
    step: flow.step,
    restoreOnboardingId: flow.restoreOnboardingId,
    restoreFormData: flow.setFormData,
    goToStep: flow.setStep,
    restartOnboarding: flow.restartOnboarding,
    onAfterDiscard: () => setStepError(null),
  });

  const handleSetClinicDetails = (data: ClinicDetails) => {
    setStepError(null);
    flow.setClinicDetails(data);
  };

  const handleSetPlanSelection = (
    tier: string,
    billingCycle: "MONTHLY" | "YEARLY",
    pricing: { monthly: number | "custom"; yearly: number | "custom" },
    options?: {
      currency?: string;
      mode?: PlanMode;
    },
  ) =>
    withStepErrorHandling(
      () =>
        flow.setPlanSelection(tier, billingCycle, pricing, {
          ...options,
          currency: options?.currency,
        }),
      setStepError,
      "We could not continue with this plan right now. Please try again.",
      "save",
    );

  const handleSetTeamMembers = (
    members: Parameters<typeof flow.setTeamMembers>[0],
  ) =>
    withStepErrorHandling(
      () => flow.setTeamMembers(members),
      setStepError,
      "We could not continue setup. Please try again.",
      "save",
    );

  const handleSkipTeamStep = () =>
    withStepErrorHandling(
      () => flow.setTeamMembers([]),
      setStepError,
      "We could not continue setup. Please try again.",
      "save",
    );

  const handleSubmitRegistration = (
    data: ComplianceSettings,
    successCallback: () => void,
  ) =>
    withStepErrorHandling(
      () => flow.submitRegistration(data, successCallback),
      setStepError,
      "We could not complete setup. Please check your details and try again.",
      "form",
    );

  return {
    ...flow,
    stepError,
    setStepError,
    clinicForm,
    complianceForm,
    showDraftDialog,
    setShowDraftDialog,
    savedDraft,
    handleRestoreDraft,
    handleDiscardDraft,
    handleSetClinicDetails,
    handleSetPlanSelection,
    handleSetTeamMembers,
    handleSkipTeamStep,
    handleSubmitRegistration,
  };
}
