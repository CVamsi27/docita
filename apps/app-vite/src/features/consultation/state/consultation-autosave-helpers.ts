import type { ConsultationDraftState } from "@/features/consultation/state/consultation-draft.types";

export const AUTOSAVE_DEBOUNCE_MS = 2200;

export function serializeDraftForSession(
  state: Pick<
    ConsultationDraftState,
    | "appointmentId"
    | "chiefComplaint"
    | "history"
    | "examination"
    | "diagnosis"
    | "treatment"
    | "prescriptions"
    | "dentalChart"
    | "eyeExam"
    | "growthData"
    | "cardiologyExam"
    | "dermatologyExam"
    | "gynecologyExam"
    | "psychiatryExam"
    | "investigations"
    | "followUpPlan"
  >,
): string | null {
  if (!state.appointmentId) return null;
  return JSON.stringify({
    chiefComplaint: state.chiefComplaint,
    history: state.history,
    examination: state.examination,
    diagnosis: state.diagnosis,
    treatment: state.treatment,
    prescriptions: state.prescriptions,
    dentalChart: state.dentalChart,
    eyeExam: state.eyeExam,
    growthData: state.growthData,
    cardiologyExam: state.cardiologyExam,
    dermatologyExam: state.dermatologyExam,
    gynecologyExam: state.gynecologyExam,
    psychiatryExam: state.psychiatryExam,
    investigations: state.investigations,
    followUpPlan: state.followUpPlan,
    savedAt: Date.now(),
  });
}

interface CodedDiagnosisItem {
  icdCodeId: string | undefined;
  notes: string | undefined;
  isPrimary: boolean;
}

export function buildCodedDiagnoses(
  diagnoses: ConsultationDraftState["diagnosis"],
): CodedDiagnosisItem[] {
  return diagnoses
    .filter((d) => d.icdCode?.id)
    .map((d, idx) => ({
      icdCodeId: d.icdCode?.id,
      notes: d.notes,
      isPrimary: idx === 0,
    }));
}
