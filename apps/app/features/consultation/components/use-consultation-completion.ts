"use client";

import { useMemo } from "react";
import type { AppointmentWithRelations } from "@workspace/data-access";
import { isConsultationReadOnlyStatus } from "@/features/appointments";
import { useConsultationDraft } from "@/features/consultation/state/useConsultationDraft";
import {
  canCompleteConsultation,
  getConsultationCompletionMissingFields,
} from "@/features/consultation/rules/consultationRules";
import { resolveConsultationCompletionSnapshot } from "@/features/consultation/rules/consultation-completion";

interface UseConsultationCompletionOptions {
  appointmentData?: AppointmentWithRelations | null;
}

export function useConsultationCompletion({ appointmentData }: UseConsultationCompletionOptions) {
  const draftChiefComplaint = useConsultationDraft((s) => s.chiefComplaint);
  const draftDiagnosis = useConsultationDraft((s) => s.diagnosis);

  const consultationReadOnly = appointmentData
    ? isConsultationReadOnlyStatus(appointmentData.status)
    : false;

  const completionSnapshot = useMemo(() => {
    if (!appointmentData) return null;
    return resolveConsultationCompletionSnapshot(appointmentData, {
      chiefComplaint: draftChiefComplaint,
      diagnosis: draftDiagnosis,
    });
  }, [appointmentData, draftChiefComplaint, draftDiagnosis]);

  const completionMissingFields = useMemo(
    () =>
      completionSnapshot
        ? getConsultationCompletionMissingFields(completionSnapshot)
        : [],
    [completionSnapshot],
  );

  const canMarkDone =
    !consultationReadOnly &&
    Boolean(completionSnapshot && canCompleteConsultation(completionSnapshot));

  const markDoneDisabledReason =
    completionMissingFields.length > 0
      ? `Add ${completionMissingFields.join(", ")} before marking done`
      : undefined;

  return {
    consultationReadOnly,
    completionSnapshot,
    completionMissingFields,
    canMarkDone,
    markDoneDisabledReason,
  };
}
