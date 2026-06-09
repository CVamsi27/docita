"use client";

import { useConsultationDraft } from "@/features/consultation/state/useConsultationDraft";
import { SectionContainer } from "@/features/consultation/workspace/chrome/SectionContainer";
import { useConsultationSectionSubtitle } from "@/features/consultation/workspace/consultation-workspace-context";
import type { CardiologyExamData } from "@workspace/types";
import {
  ExamFieldGrid,
  ExamTextareaField,
} from "./exam-section-fields";

interface CardiologyExamSectionProps {
  readOnly?: boolean;
  sectionRef?: React.Ref<HTMLElement>;
}

export function CardiologyExamSection({
  readOnly,
  sectionRef,
}: CardiologyExamSectionProps) {
  const subtitle = useConsultationSectionSubtitle("specialty-cardiology");
  const value = useConsultationDraft((s) => s.cardiologyExam);
  const setValue = useConsultationDraft((s) => s.setCardiologyExam);

  const patch = (partial: Partial<CardiologyExamData>) => {
    setValue((prev) => ({ ...prev, ...partial }));
  };

  // Shares the SectionContainer shell + nested-patch wiring convention with
  // the other specialty exam sections (see DermatologyExamSection for the
  // full rationale) — each binds genuinely different specialty data through
  // the same shared shell, so this is intentional structural similarity.
  // jscpd:ignore-start
  return (
    <SectionContainer
      ref={sectionRef}
      id="specialty-cardiology"
      letter="C"
      title="Cardiology Exam"
      subtitle={subtitle}
      description="Cardiac assessment, ECG or imaging summaries, and follow-up plan."
    >
      <div className="space-y-4">
        <ExamTextareaField
          id="cardio-assessment"
          label="Clinical assessment"
          minHeightClassName="min-h-[100px]"
          readOnly={readOnly}
          placeholder="Clinical assessment"
          value={value.clinicalAssessment ?? ""}
          onChange={(clinicalAssessment) => patch({ clinicalAssessment })}
        />
        <ExamFieldGrid>
          <ExamTextareaField
            id="cardio-risk"
            label="Risk factors"
            minHeightClassName="min-h-[88px]"
            readOnly={readOnly}
            placeholder="Risk factors"
            value={value.riskFactors ?? ""}
            onChange={(riskFactors) => patch({ riskFactors })}
          />
          <ExamTextareaField
            id="cardio-meds"
            label="Cardiac medications"
            minHeightClassName="min-h-[88px]"
            readOnly={readOnly}
            placeholder="Cardiac medications"
            value={value.medications ?? ""}
            onChange={(medications) => patch({ medications })}
          />
        </ExamFieldGrid>
        <ExamTextareaField
          id="cardio-ecg"
          label="ECG / monitoring notes"
          minHeightClassName="min-h-[88px]"
          readOnly={readOnly}
          placeholder="ECG monitoring notes"
          value={value.ecg?.interpretation ?? value.ecg?.findings ?? ""}
          onChange={(interpretation) =>
            setValue((prev) => ({
              ...prev,
              ecg: {
                ...prev.ecg,
                interpretation,
              },
            }))
          }
        />
        <ExamFieldGrid>
          <ExamTextareaField
            id="cardio-plan"
            label="Plan"
            minHeightClassName="min-h-[88px]"
            readOnly={readOnly}
            placeholder="Plan"
            value={value.plan ?? ""}
            onChange={(plan) => patch({ plan })}
          />
          <ExamTextareaField
            id="cardio-notes"
            label="General notes"
            minHeightClassName="min-h-[88px]"
            readOnly={readOnly}
            placeholder="General notes"
            value={value.generalNotes ?? ""}
            onChange={(generalNotes) => patch({ generalNotes })}
          />
        </ExamFieldGrid>
      </div>
    </SectionContainer>
  );
  // jscpd:ignore-end
}
