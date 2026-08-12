import type { Ref } from "react";
import { useConsultationDraft } from "@/features/consultation/state/useConsultationDraft";
import { SectionContainer } from "@/features/consultation/workspace/chrome/SectionContainer";
import { useConsultationSectionSubtitle } from "@/features/consultation/workspace/consultation-workspace-context";
import type { GynecologyExamData } from "@workspace/types";
import { ExamAssessmentPlanFields, ExamTextareaField } from "./exam-section-fields";

interface GynecologyExamSectionProps {
  readOnly?: boolean;
  sectionRef?: Ref<HTMLElement>;
}

export function GynecologyExamSection({
  readOnly,
  sectionRef,
}: GynecologyExamSectionProps) {
  const subtitle = useConsultationSectionSubtitle("specialty-gynecology");
  const value = useConsultationDraft((s) => s.gynecologyExam);
  const setValue = useConsultationDraft((s) => s.setGynecologyExam);

  const patch = (partial: Partial<GynecologyExamData>) => {
    setValue((prev) => ({ ...prev, ...partial }));
  };

  const lmp = value.menstrualHistory?.lmp ?? "";

  return (
    <SectionContainer
      ref={sectionRef}
      id="specialty-gynecology"
      letter="Y"
      title="Gynecology Exam"
      subtitle={subtitle}
      description="Menstrual and obstetric context, examination, and plan."
    >
      <div className="space-y-4">
        <ExamTextareaField
          id="gyn-lmp"
          label="Last menstrual period (LMP)"
          minHeightClassName="min-h-[72px]"
          readOnly={readOnly}
          placeholder="Last menstrual period"
          value={lmp}
          onChange={(lmpValue) =>
            setValue((prev) => ({
              ...prev,
              menstrualHistory: {
                ...prev.menstrualHistory,
                lmp: lmpValue,
              },
            }))
          }
        />
        <ExamTextareaField
          id="gyn-antenatal"
          label="Antenatal / pregnancy notes"
          minHeightClassName="min-h-[100px]"
          readOnly={readOnly}
          placeholder="Antenatal notes"
          value={value.antenatalRecord?.notes ?? ""}
          onChange={(notes) =>
            setValue((prev) => ({
              ...prev,
              antenatalRecord: {
                ...prev.antenatalRecord,
                notes,
              },
            }))
          }
        />
        <ExamAssessmentPlanFields
          idPrefix="gyn"
          readOnly={readOnly}
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
