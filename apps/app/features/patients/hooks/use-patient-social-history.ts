import { useCallback } from "react";
import { useUpsertPatientSocialHistory } from "@workspace/data-access";
import type { PatientSocialHistory } from "@workspace/types";
import { buildSocialHistoryUpsertPayload } from "@/features/patients/lib/patient-social-history-update.boundary";

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
      const next = buildSocialHistoryUpsertPayload(
        socialHistory,
        field,
        value,
      );
      upsertSocialHistory(next, { onError });
    },
    [socialHistory, upsertSocialHistory, onError],
  );

  return {
    updateSocialHistory,
  };
}
