import { serializeChiefComplaintsForPatch } from "@workspace/utils";
import {
  updateAppointmentRequestSchema,
  type UpdateAppointmentRequest,
} from "@workspace/types";
import type { ExaminationData } from "@/features/consultation/components/structured/ExaminationInput";
import { getConsultationPersistKeysForClinic } from "@/features/consultation/workspace/consultation-section-registry";
import type { useConsultationDraft } from "@/features/consultation/state/useConsultationDraft";

type DraftState = ReturnType<typeof useConsultationDraft.getState>;

function mapGeneralExaminationForPatch(
  general: ExaminationData["general"],
): Record<string, unknown> {
  const { notes, ...rest } = general;
  const generalNotes = typeof notes === "string" ? notes : "";
  return { ...rest, generalNotes };
}

export function buildConsultationAppointmentPatch(
  state: DraftState,
  clinicType?: string,
): UpdateAppointmentRequest {
  const chiefComplaintText = serializeChiefComplaintsForPatch(
    state.chiefComplaint,
  );
  const systemicExamination: Record<string, unknown> = {
    cvs: { notes: state.examination.systemic.cvs },
    rs: { notes: state.examination.systemic.rs },
    pa: { notes: state.examination.systemic.pa },
    cns: { notes: state.examination.systemic.cns },
    additionalNotes: state.examination.systemic.notes,
  };
  const ms = state.examination.systemic.musculoskeletal?.trim();
  if (ms) {
    systemicExamination.mss = { jointExamination: ms };
  }
  const patch: Record<string, unknown> = {
    chiefComplaint: chiefComplaintText,
    historyOfPresentIllness: state.history,
    treatmentPlan: state.treatment,
    finalDiagnosis: JSON.stringify(state.diagnosis),
    followUpPlan: state.followUpPlan,
    generalExamination: mapGeneralExaminationForPatch(state.examination.general),
    systemicExamination,
  };
  const persistKeys = getConsultationPersistKeysForClinic(clinicType);
  for (const key of persistKeys) {
    switch (key) {
      case "dentalChart":
        patch.dentalChart = state.dentalChart;
        break;
      case "ophthalmologyExam":
        patch.ophthalmologyExam = state.eyeExam;
        break;
      case "growthData":
        patch.growthData = state.growthData;
        break;
      case "cardiologyExam":
        patch.cardiologyExam = state.cardiologyExam;
        break;
      case "dermatologyExam":
        patch.dermatologyExam = state.dermatologyExam;
        break;
      case "gynecologyExam":
        patch.gynecologyExam = state.gynecologyExam;
        break;
      case "psychiatryExam":
        patch.psychiatryExam = state.psychiatryExam;
        break;
      case "investigations":
        patch.investigations = state.investigations;
        break;
      default:
        break;
    }
  }
  return updateAppointmentRequestSchema.parse(patch);
}