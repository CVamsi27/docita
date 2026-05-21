"use client";

import { useCallback, useEffect, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { DEFAULT_COUNTRY_CODE } from "@workspace/utils";
import {
  type ClinicDetails,
  type ComplianceSettings,
  defaultClinicRegistrationData,
  defaultComplianceValues,
} from "@/features/onboarding/components/types";
import {
  DRAFT_KEY,
  SESSION_ONBOARDING_ID_KEY,
  hasMeaningfulClinicDraftData,
  parseClinicDetailsDraft,
  parseOnboardingDraft,
  type OnboardingDraft,
} from "./clinic-registration-form-helpers";

interface UseOnboardingDraftOptions {
  clinicForm: UseFormReturn<ClinicDetails>;
  complianceForm: UseFormReturn<ComplianceSettings>;
  onboardingId: string | null;
  restoreOnboardingId: (id: string) => void;
  restartOnboarding: () => void;
  onAfterDiscard?: () => void;
}

export function useOnboardingDraft({
  clinicForm,
  complianceForm,
  onboardingId,
  restoreOnboardingId,
  restartOnboarding,
  onAfterDiscard,
}: UseOnboardingDraftOptions) {
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [savedDraft, setSavedDraft] = useState<OnboardingDraft | null>(null);

  // Load draft on mount; show restore prompt or silently rehydrate
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = parseOnboardingDraft(JSON.parse(raw));
      if (!draft) return;
      const currentOnboardingId =
        typeof sessionStorage !== "undefined"
          ? sessionStorage.getItem(SESSION_ONBOARDING_ID_KEY)
          : null;
      const persistedStep =
        typeof sessionStorage !== "undefined"
          ? Number(sessionStorage.getItem("docita_onboarding_step") || "1")
          : 1;
      const ageMs = Date.now() - new Date(draft.savedAt).getTime();
      const hasMeaningfulDraft =
        hasMeaningfulClinicDraftData(draft.clinicDetails) ||
        Boolean(draft.onboardingId);
      const isSameOnboardingSession =
        Boolean(draft.onboardingId) &&
        draft.onboardingId === currentOnboardingId;
      const hasActiveSessionProgress =
        Boolean(currentOnboardingId) && persistedStep > 1;

      if (
        ageMs < 24 * 60 * 60 * 1000 &&
        hasMeaningfulDraft &&
        !isSameOnboardingSession &&
        !hasActiveSessionProgress
      ) {
        setSavedDraft(draft);
        setShowDraftDialog(true);
      } else if (
        ageMs < 24 * 60 * 60 * 1000 &&
        hasMeaningfulDraft &&
        (isSameOnboardingSession || hasActiveSessionProgress)
      ) {
        const clinicDetails = parseClinicDetailsDraft(draft.clinicDetails);
        if (clinicDetails) clinicForm.reset(clinicDetails);
      } else {
        localStorage.removeItem(DRAFT_KEY);
      }
    } catch {
      // ignore parse errors
    }
  }, [clinicForm]);

  const handleRestoreDraft = () => {
    if (savedDraft?.clinicDetails) {
      const clinicDetails = parseClinicDetailsDraft(savedDraft.clinicDetails);
      if (clinicDetails) clinicForm.reset(clinicDetails);
    }
    if (savedDraft?.onboardingId) {
      restoreOnboardingId(savedDraft.onboardingId);
    }
    setShowDraftDialog(false);
    setSavedDraft(null);
  };

  const handleDiscardDraft = () => {
    restartOnboarding();
    clinicForm.reset({
      ...defaultClinicRegistrationData.clinicDetails,
      facilityLabel: "CLINIC",
      countryCode: DEFAULT_COUNTRY_CODE,
    });
    complianceForm.reset({ ...defaultComplianceValues });
    localStorage.removeItem(DRAFT_KEY);
    setShowDraftDialog(false);
    setSavedDraft(null);
    onAfterDiscard?.();
  };

  const persistDraft = useCallback(
    (clinicDetails: Partial<ClinicDetails>) => {
      try {
        const draft: OnboardingDraft = {
          clinicDetails,
          savedAt: new Date().toISOString(),
          onboardingId,
        };
        const hasMeaningfulDraft =
          hasMeaningfulClinicDraftData(clinicDetails) || Boolean(onboardingId);
        if (!hasMeaningfulDraft) {
          localStorage.removeItem(DRAFT_KEY);
          return;
        }
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch {
        // Storage quota exceeded or unavailable
      }
    },
    [onboardingId],
  );

  useEffect(() => {
    const subscription = clinicForm.watch((values) => {
      persistDraft(values);
    });
    return () => subscription.unsubscribe();
  }, [clinicForm, persistDraft]);

  useEffect(() => {
    persistDraft(clinicForm.getValues());
  }, [clinicForm, onboardingId, persistDraft]);

  return {
    showDraftDialog,
    setShowDraftDialog,
    savedDraft,
    handleRestoreDraft,
    handleDiscardDraft,
  };
}
