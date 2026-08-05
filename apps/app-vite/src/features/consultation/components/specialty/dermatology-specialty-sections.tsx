import type { Ref } from "react";
import { useConsultationDraft } from "@/features/consultation/state/useConsultationDraft";
import { SectionContainer } from "@/features/consultation/workspace/chrome/SectionContainer";
import { useConsultationSectionSubtitle } from "@/features/consultation/workspace/consultation-workspace-context";
import type { DermatologyExamData } from "@workspace/types";
import { ExamAssessmentPlanFields, ExamTextareaField } from "./exam-section-fields";

interface DermatologyExamSectionProps {
  readOnly?: boolean;
  sectionRef?: Ref<HTMLElement>;
}

export function DermatologyExamSection({
  readOnly,
  sectionRef,
}: DermatologyExamSectionProps) {
  const subtitle = useConsultationSectionSubtitle("specialty-dermatology");
  const value = useConsultationDraft((s) => s.dermatologyExam);
  const setValue = useConsultationDraft((s) => s.setDermatologyExam);
  const patch = (partial: Partial<DermatologyExamData>) => {
    setValue((prev) => ({ ...prev, ...partial }));
  };
  const skinNotes =
    value.skinAssessment?.generalCondition ?? value.skinAssessment?.notes ?? "";

  return (
    <SectionContainer
      ref={sectionRef}
      id="specialty-dermatology"
      letter="K"
      title="Dermatology Exam"
      subtitle={subtitle}
      description="Skin examination and lesion documentation."
    >
      <div className="space-y-4">
        <ExamTextareaField
          id="derm-skin"
          label="Skin examination"
          minHeightClassName="min-h-[120px]"
          readOnly={readOnly}
          placeholder="Skin examination"
          value={skinNotes}
          onChange={(generalCondition) =>
            setValue((prev) => ({
              ...prev,
              skinAssessment: {
                ...prev.skinAssessment,
                generalCondition,
              },
            }))
          }
        />
        <ExamAssessmentPlanFields
          idPrefix="derm"
          readOnly={readOnly}
          withPlaceholders
          clinicalAssessment={value.clinicalAssessment ?? ""}
          plan={value.plan ?? ""}
          onClinicalAssessmentChange={(clinicalAssessment) =>
            patch({ clinicalAssessment })
          }
          onPlanChange={(plan) => patch({ plan })}
        />
      </div>
    </SectionContainer>
  );
}
