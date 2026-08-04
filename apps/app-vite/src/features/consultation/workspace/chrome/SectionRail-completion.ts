import type { ConsultationDraftState } from "@/features/consultation/state/useConsultationDraft";

type SectionCompletionDraft = Pick<
  ConsultationDraftState,
  | "chiefComplaint"
  | "history"
  | "examination"
  | "diagnosis"
  | "treatment"
  | "prescriptions"
  | "followUpPlan"
  | "dentalChart"
  | "eyeExam"
  | "growthData"
  | "cardiologyExam"
  | "dermatologyExam"
  | "gynecologyExam"
  | "psychiatryExam"
  | "investigations"
>;

export function buildSectionCompletion(
  draft: SectionCompletionDraft,
): Record<string, boolean> {
  return {
    subjective: hasSubjective(draft),
    objective: isExamComplete(draft.examination),
    assessment: hasAssessment(draft),
    plan: hasPlan(draft),
    "specialty-dental": Object.keys(draft.dentalChart).length > 0,
    "specialty-vision": Object.keys(draft.eyeExam).length > 0,
    "specialty-growth": (draft.growthData?.measurements?.length ?? 0) > 0,
    "specialty-cardiology": specialtyJsonFilled(draft.cardiologyExam),
    "specialty-dermatology": specialtyJsonFilled(draft.dermatologyExam),
    "specialty-gynecology": specialtyJsonFilled(draft.gynecologyExam),
    "specialty-psychiatry": specialtyJsonFilled(draft.psychiatryExam),
    "specialty-investigations": draft.investigations.length > 0,
  };
}

function hasSubjective(draft: SectionCompletionDraft): boolean {
  return [
    draft.chiefComplaint.some((item) => Boolean(item.complaint?.trim())),
    Boolean(draft.history.trim()),
  ].some(Boolean);
}

function isExamComplete(
  examination: SectionCompletionDraft["examination"],
): boolean {
  return [
    Boolean(examination.general.notes?.trim()),
    examination.general.pallor,
    examination.general.icterus,
    examination.general.cyanosis,
    examination.general.clubbing,
    examination.general.lymphadenopathy,
    examination.general.edema,
    Boolean(examination.systemic.cvs?.trim()),
    Boolean(examination.systemic.rs?.trim()),
    Boolean(examination.systemic.pa?.trim()),
    Boolean(examination.systemic.cns?.trim()),
    Boolean(examination.systemic.musculoskeletal?.trim()),
    Boolean(examination.systemic.notes?.trim()),
  ].some(Boolean);
}

function hasAssessment(draft: SectionCompletionDraft): boolean {
  return draft.diagnosis.some(
    (item) => (item.condition?.trim().length ?? 0) > 0,
  );
}

function hasPlan(draft: SectionCompletionDraft): boolean {
  return [
    Boolean(draft.treatment.trim()),
    draft.prescriptions.length > 0,
    Boolean(draft.followUpPlan.trim()),
  ].some(Boolean);
}

function specialtyJsonFilled(
  value: SectionCompletionDraft["cardiologyExam"],
): boolean {
  const serialized = JSON.stringify(value);
  return serialized.length > 2 && serialized !== "{}" && serialized !== "[]";
}
