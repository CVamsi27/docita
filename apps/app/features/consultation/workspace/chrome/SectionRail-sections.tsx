"use client";

import { useMemo } from "react";
import { useConsultationDraft } from "@/features/consultation/state/useConsultationDraft";
import { buildSectionCompletion } from "./SectionRail-completion";

export type { ConsultationSection } from "@/features/consultation/workspace/consultation-section-registry";
export { findNextStep } from "./SectionRail-next-step";

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
    return buildSectionCompletion({
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
    });
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
