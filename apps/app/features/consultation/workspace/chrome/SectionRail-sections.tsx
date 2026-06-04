"use client";

import { useMemo } from "react";
import { useConsultationDraft } from "@/features/consultation/state/useConsultationDraft";
import type { ConsultationSection } from "@/features/consultation/workspace/consultation-section-registry";

export type { ConsultationSection } from "@/features/consultation/workspace/consultation-section-registry";

export function findNextStep(
  sections: ConsultationSection[],
  completion: Record<string, boolean>,
): ConsultationSection | null {
  for (const s of sections) {
    if (s.required && !completion[s.id]) return s;
  }
  for (const s of sections) {
    if (!completion[s.id]) return s;
  }
  return null;
}

function specialtyJsonFilled(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value !== "object") return false;
  const s = JSON.stringify(value);
  return s.length > 2 && s !== "{}" && s !== "[]";
}

export function useSectionCompletion() {
  const chiefComplaint = useConsultationDraft((s) => s.chiefComplaint);
  const history = useConsultationDraft((s) => s.history);
  const examination = useConsultationDraft((s) => s.examination);
  const diagnosis = useConsultationDraft((s) => s.diagnosis);
  const treatment = useConsultationDraft((s) => s.treatment);
  const prescriptions = useConsultationDraft((s) => s.prescriptions);
  const followUpPlan = useConsultationDraft((s) => s.followUpPlan);
  const dentalChart = useConsultationDraft((s) => s.dentalChart);
  const eyeExam = useConsultationDraft((s) => s.eyeExam);
  const growthData = useConsultationDraft((s) => s.growthData);
  const cardiologyExam = useConsultationDraft((s) => s.cardiologyExam);
  const dermatologyExam = useConsultationDraft((s) => s.dermatologyExam);
  const gynecologyExam = useConsultationDraft((s) => s.gynecologyExam);
  const psychiatryExam = useConsultationDraft((s) => s.psychiatryExam);
  const investigations = useConsultationDraft((s) => s.investigations);

  return useMemo(() => {
    const examComplete =
      !!examination.general.notes?.trim() ||
      examination.general.pallor ||
      examination.general.icterus ||
      examination.general.cyanosis ||
      examination.general.clubbing ||
      examination.general.lymphadenopathy ||
      examination.general.edema ||
      !!examination.systemic.cvs?.trim() ||
      !!examination.systemic.rs?.trim() ||
      !!examination.systemic.pa?.trim() ||
      !!examination.systemic.cns?.trim() ||
      !!examination.systemic.musculoskeletal?.trim() ||
      !!examination.systemic.notes?.trim();

    const map: Record<string, boolean> = {
      subjective:
        (chiefComplaint.length > 0 &&
          chiefComplaint.some((c) => c.complaint?.trim())) ||
        !!history.trim(),
      objective: examComplete,
      assessment:
        diagnosis.length > 0 &&
        diagnosis.some((d) => (d.condition?.trim().length ?? 0) > 0),
      plan:
        !!treatment.trim() || prescriptions.length > 0 || !!followUpPlan.trim(),
      "specialty-dental": Object.keys(dentalChart).length > 0,
      "specialty-vision": Object.keys(eyeExam).length > 0,
      "specialty-growth": (growthData?.measurements?.length ?? 0) > 0,
      "specialty-cardiology": specialtyJsonFilled(cardiologyExam),
      "specialty-dermatology": specialtyJsonFilled(dermatologyExam),
      "specialty-gynecology": specialtyJsonFilled(gynecologyExam),
      "specialty-psychiatry": specialtyJsonFilled(psychiatryExam),
      "specialty-investigations": investigations.length > 0,
    };
    return map;
  }, [
    chiefComplaint,
    history,
    examination,
    diagnosis,
    treatment,
    prescriptions,
    followUpPlan,
    dentalChart,
    eyeExam,
    growthData,
    cardiologyExam,
    dermatologyExam,
    gynecologyExam,
    psychiatryExam,
    investigations,
  ]);
}
