"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { DEFAULT_COUNTRY_CODE } from "@workspace/utils";
import {
  type ClinicDetails,
  type ClinicRegistrationData,
  type ComplianceSettings,
  defaultClinicRegistrationData,
  defaultComplianceValues,
} from "@/features/onboarding/components/types";
import {
  DRAFT_KEY,
  SESSION_ONBOARDING_ID_KEY,
  SESSION_KEY,
  buildResumeFormData,
  hasMeaningfulComplianceDraftData,
  hasMeaningfulClinicDraftData,
  parseClinicDetailsDraft,
  parseOnboardingDraft,
  resolveResumeStep,
  type OnboardingDraft,
} from "./clinic-registration-form-helpers";

interface UseOnboardingDraftOptions {
  clinicForm: UseFormReturn<ClinicDetails>;
  complianceForm: UseFormReturn<ComplianceSettings>;
  onboardingId: string | null;
  formData: ClinicRegistrationData;
  step: number;
  restoreOnboardingId: (id: string) => void;
  restoreFormData: (data: ClinicRegistrationData) => void;
  goToStep: (step: number) => void;
  restartOnboarding: () => void;
  onAfterDiscard?: () => void;
}

export function useOnboardingDraft({
  clinicForm,
  complianceForm,
  onboardingId,
  formData,
  step,
  restoreOnboardingId,
  restoreFormData,
  goToStep,
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
          ? Number(sessionStorage.getItem(SESSION_KEY) || "1")
          : 1;
      const ageMs = Date.now() - new Date(draft.savedAt).getTime();
      const hasMeaningfulDraft =
        hasMeaningfulClinicDraftData(draft.clinicDetails) ||
        hasMeaningfulComplianceDraftData(draft.compliance) ||
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
        complianceForm.reset({
          ...defaultComplianceValues,
          ...draft.compliance,
        });
      } else {
        localStorage.removeItem(DRAFT_KEY);
      }
    } catch {
      // ignore parse errors
    }
  }, [clinicForm, complianceForm]);

  const handleRestoreDraft = () => {
    if (!savedDraft) return;

    // Rehydrate the full flow snapshot first so steps 2–5 have the data they
    // need (weekly hours, team, plan) and StepGuard does not restart us. Older
    // drafts without a snapshot fall back to a reconstruction from their fields.
    restoreFormData(buildResumeFormData(savedDraft));
    if (savedDraft.onboardingId) {
      restoreOnboardingId(savedDraft.onboardingId);
    }

    // Rehydrate the live RHF forms from the freshest field-level draft.
    const clinicDetails = parseClinicDetailsDraft(savedDraft.clinicDetails);
    if (clinicDetails) clinicForm.reset(clinicDetails);
    complianceForm.reset({
      ...defaultComplianceValues,
      ...savedDraft.compliance,
    });

    // Finally, land the user on the step they left off at.
    goToStep(resolveResumeStep(savedDraft));

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

  // Keep the latest flow snapshot in a ref so the draft writer stays stable
  // and does not re-subscribe the form watchers on every step/field change.
  const flowSnapshotRef = useRef({ formData, step });
  flowSnapshotRef.current = { formData, step };

  const persistDraft = useCallback(
    (
      clinicDetails: Partial<ClinicDetails>,
      compliance: Partial<ComplianceSettings>,
    ) => {
      try {
        const { formData: snapshotFormData, step: snapshotStep } =
          flowSnapshotRef.current;
        const draft: OnboardingDraft = {
          clinicDetails,
          compliance,
          formData: snapshotFormData,
          step: snapshotStep,
          savedAt: new Date().toISOString(),
          onboardingId,
        };
        const hasMeaningfulDraft =
          hasMeaningfulClinicDraftData(clinicDetails) ||
          hasMeaningfulComplianceDraftData(compliance) ||
          snapshotStep > 1 ||
          Boolean(onboardingId);
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
      persistDraft(values, complianceForm.getValues());
    });
    return () => subscription.unsubscribe();
  }, [clinicForm, complianceForm, persistDraft]);

  useEffect(() => {
    const subscription = complianceForm.watch((values) => {
      persistDraft(clinicForm.getValues(), values);
    });
    return () => subscription.unsubscribe();
  }, [clinicForm, complianceForm, persistDraft]);

  // Persist whenever the flow snapshot (step / hours / team / plan) advances so
  // a returning user resumes on the right step with all prior data intact.
  useEffect(() => {
    persistDraft(clinicForm.getValues(), complianceForm.getValues());
  }, [clinicForm, complianceForm, onboardingId, formData, step, persistDraft]);

  return {
    showDraftDialog,
    setShowDraftDialog,
    savedDraft,
    handleRestoreDraft,
    handleDiscardDraft,
  };
}
