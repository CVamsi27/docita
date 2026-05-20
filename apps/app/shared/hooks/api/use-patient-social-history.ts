import { useCallback } from "react";
import { useUpsertPatientSocialHistory } from "@workspace/data-access";
import type {
  CreatePatientSocialHistoryInput,
  PatientSocialHistory,
} from "@workspace/types";

interface UsePatientSocialHistoryOptions {
  patientId: string;
  socialHistory: PatientSocialHistory | null | undefined;
  invalidatePatient: () => void;
  onError: (error: unknown) => void;
}

export function usePatientSocialHistory({
  patientId,
  socialHistory,
  invalidatePatient: _invalidatePatient,
  onError,
}: UsePatientSocialHistoryOptions) {
  const { mutate: upsertSocialHistory } = useUpsertPatientSocialHistory(patientId);

  const updateSocialHistory = useCallback(
    (field: keyof PatientSocialHistory, value: string) => {
      const next: CreatePatientSocialHistoryInput = {
        smokingStatus: socialHistory?.smokingStatus,
        smokingPackYears: socialHistory?.smokingPackYears,
        smokingQuitDate: socialHistory?.smokingQuitDate,
        alcoholUse: socialHistory?.alcoholUse,
        alcoholFrequency: socialHistory?.alcoholFrequency,
        substanceUse: socialHistory?.substanceUse,
        occupation: socialHistory?.occupation,
        occupationalHazards: socialHistory?.occupationalHazards,
        exerciseFrequency: socialHistory?.exerciseFrequency,
        dietaryRestrictions: socialHistory?.dietaryRestrictions,
        notes: socialHistory?.notes,
        [field]: value,
      } as CreatePatientSocialHistoryInput;
      upsertSocialHistory(next, { onError });
    },
    [socialHistory, upsertSocialHistory, onError],
  );

  return {
    updateSocialHistory,
  };
}
