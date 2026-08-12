import type { Ref } from "react";
import { useTranslation } from "react-i18next";
import { useConsultationDraft } from "@/features/consultation/state/useConsultationDraft";
import { SectionContainer } from "@/features/consultation/workspace/chrome/SectionContainer";
import { useConsultationSectionSubtitle } from "@/features/consultation/workspace/consultation-workspace-context";
import type { CardiologyExamData } from "@workspace/types";
import { ExamFieldGrid, ExamTextareaField } from "./exam-section-fields";

interface CardiologyExamSectionProps {
  readOnly?: boolean;
  sectionRef?: Ref<HTMLElement>;
}

/**
 * apps/app Consultation > cardiology exam section. Copy resolves through the
 * "Consultation.cardiologyExam" message namespace.
 */
function useCardiologyExamTranslations() {
  const { t } = useTranslation("Consultation");
  return (key: string, params?: Record<string, unknown>) =>
    t(`cardiologyExam.${key}`, params);
}

export function CardiologyExamSection({
  readOnly,
  sectionRef,
}: CardiologyExamSectionProps) {
  const t = useCardiologyExamTranslations();
  const subtitle = useConsultationSectionSubtitle("specialty-cardiology");
  const value = useConsultationDraft((s) => s.cardiologyExam);
  const setValue = useConsultationDraft((s) => s.setCardiologyExam);

  const patch = (partial: Partial<CardiologyExamData>) => {
    setValue((prev) => ({ ...prev, ...partial }));
  };

  return (
    <SectionContainer
      ref={sectionRef}
      id="specialty-cardiology"
      letter="C"
      title={t("title")}
      subtitle={subtitle}
      description={t("description")}
    >
      <div className="space-y-4">
        <ExamTextareaField
          id="cardio-assessment"
          label={t("clinicalAssessmentLabel")}
          minHeightClassName="min-h-[100px]"
          readOnly={readOnly}
          placeholder={t("clinicalAssessmentPlaceholder")}
          value={value.clinicalAssessment ?? ""}
          onChange={(clinicalAssessment) => patch({ clinicalAssessment })}
        />
        <ExamFieldGrid>
          <ExamTextareaField
            id="cardio-risk"
            label={t("riskFactorsLabel")}
            minHeightClassName="min-h-[88px]"
            readOnly={readOnly}
            placeholder={t("riskFactorsPlaceholder")}
            value={value.riskFactors ?? ""}
            onChange={(riskFactors) => patch({ riskFactors })}
          />
          <ExamTextareaField
            id="cardio-meds"
            label={t("cardiacMedicationsLabel")}
            minHeightClassName="min-h-[88px]"
            readOnly={readOnly}
            placeholder={t("cardiacMedicationsPlaceholder")}
            value={value.medications ?? ""}
            onChange={(medications) => patch({ medications })}
          />
        </ExamFieldGrid>
        <ExamTextareaField
          id="cardio-ecg"
          label={t("ecgLabel")}
          minHeightClassName="min-h-[88px]"
          readOnly={readOnly}
          placeholder={t("ecgPlaceholder")}
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
            label={t("planLabel")}
            minHeightClassName="min-h-[88px]"
            readOnly={readOnly}
            placeholder={t("planPlaceholder")}
            value={value.plan ?? ""}
            onChange={(plan) => patch({ plan })}
          />
          <ExamTextareaField
            id="cardio-notes"
            label={t("generalNotesLabel")}
            minHeightClassName="min-h-[88px]"
            readOnly={readOnly}
            placeholder={t("generalNotesPlaceholder")}
            value={value.generalNotes ?? ""}
            onChange={(generalNotes) => patch({ generalNotes })}
          />
        </ExamFieldGrid>
      </div>
    </SectionContainer>
  );
}
