import type { Appointment } from "@workspace/types";
import { serializeChiefComplaintsForPatch } from "@workspace/utils";
import type { ChiefComplaintItem } from "@/features/consultation/components/structured/chief-complaint.types";
import type { DiagnosisItem } from "@/features/consultation/components/structured/diagnosis-input-types";
import type { ConsultationCompletionInput } from "./consultation-rules";

type DraftCompletionSlice = {
  chiefComplaint: ChiefComplaintItem[];
  diagnosis: DiagnosisItem[];
};

function hasDraftDiagnosis(items: DiagnosisItem[]): boolean {
  return items.some(
    (item) =>
      item.condition.trim().length > 0 ||
      Boolean(item.icdCode?.code?.trim()) ||
      Boolean(item.icdCode?.description?.trim()),
  );
}

function hasPersistedDiagnosis(
  diagnoses: Appointment["diagnoses"] | undefined,
): boolean {
  return Array.isArray(diagnoses) && diagnoses.length > 0;
}

export function resolveConsultationCompletionSnapshot(
  appointment: Appointment,
  draft: DraftCompletionSlice | null,
): ConsultationCompletionInput {
  const draftChiefComplaint = draft?.chiefComplaint?.length
    ? serializeChiefComplaintsForPatch(draft.chiefComplaint).trim()
    : "";
  const chiefComplaint =
    draftChiefComplaint || appointment.chiefComplaint?.trim() || undefined;

  const hasDiagnosis =
    (draft ? hasDraftDiagnosis(draft.diagnosis) : false) ||
    hasPersistedDiagnosis(appointment.diagnoses);

  return {
    chiefComplaint,
    hasDiagnosis,
    hasVitals: Boolean(appointment.vitalSign),
  };
}
