"use client";

// jscpd:ignore-start
import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components";
import { useConsultationDraft } from "@/features/consultation/state/useConsultationDraft";
import { SectionContainer } from "@/features/consultation/workspace/chrome/SectionContainer";
import { useConsultationSectionSubtitle } from "@/features/consultation/workspace/consultation-workspace-context";
import { useTranslations } from "next-intl";
import { z } from "zod";
import type { PsychiatryExamData } from "@workspace/types";
import {
  ExamAssessmentPlanFields,
// jscpd:ignore-end
  ExamFieldGrid,
  ExamTextareaField,
} from "./exam-section-fields";

/**
 * Phase 3 (per-feature): apps/app Consultation > Psychiatry exam
 * section. 6 literals converted to
 * useTranslations("Consultation.psychiatryExamSection").
 */
function usePsychiatryExamTranslations() {
  return useTranslations("Consultation.psychiatryExamSection");
}

const psychiatryRiskLevelSchema = z.enum([
  "low",
  "moderate",
  "high",
  "imminent",
]);

type PsychiatryRiskLevel = z.infer<typeof psychiatryRiskLevelSchema>;

function parsePsychiatryRiskLevel(
  value: string,
): PsychiatryRiskLevel | undefined {
  const parsed = psychiatryRiskLevelSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

interface PsychiatryRiskSelectFieldProps {
  label: string;
  placeholder: string;
  readOnly?: boolean;
  value: PsychiatryRiskLevel | undefined;
  onChange: (value: PsychiatryRiskLevel | undefined) => void;
}

/**
 * Risk-level dropdown shared by the suicide-risk and homicide-risk fields —
 * identical structure and option list, differing only in label/placeholder
 * and which part of the draft they read from / write to.
 */
function PsychiatryRiskSelectField({
  label,
  placeholder,
  readOnly,
  value,
  onChange,
}: PsychiatryRiskSelectFieldProps) {
  const t = usePsychiatryExamTranslations();
  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold">{label}</Label>
      <Select
        disabled={readOnly}
        value={value ?? "unset"}
        onValueChange={(next) =>
          onChange(next === "unset" ? undefined : parsePsychiatryRiskLevel(next))
        }
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unset">{t("riskNotAssessed")}</SelectItem>
          <SelectItem value="low">{t("riskLow")}</SelectItem>
          <SelectItem value="moderate">{t("riskModerate")}</SelectItem>
          <SelectItem value="high">{t("riskHigh")}</SelectItem>
          <SelectItem value="imminent">{t("riskImminent")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

interface PsychiatryExamSectionProps {
  readOnly?: boolean;
  sectionRef?: React.Ref<HTMLElement>;
}

export function PsychiatryExamSection({
  readOnly,
  sectionRef,
}: PsychiatryExamSectionProps) {
  const t = usePsychiatryExamTranslations();
  const subtitle = useConsultationSectionSubtitle("specialty-psychiatry");
  const value = useConsultationDraft((s) => s.psychiatryExam);
  const setValue = useConsultationDraft((s) => s.setPsychiatryExam);

  const patch = (partial: Partial<PsychiatryExamData>) => {
    setValue((prev) => ({ ...prev, ...partial }));
  };

  const mseNotes = value.mse?.notes ?? "";

  // Shares the SectionContainer shell + nested-patch wiring convention with
  // the other specialty exam sections (see DermatologyExamSection for the
  // full rationale) — each binds genuinely different specialty data through
  // the same shared shell, so this is intentional structural similarity.
  // jscpd:ignore-start
  return (
    <SectionContainer
      ref={sectionRef}
      id="specialty-psychiatry"
      letter="M"
      title={t("sectionTitle")}
      subtitle={subtitle}
      description={t("sectionDescription")}
    >
      <div className="space-y-4">
        <ExamTextareaField
          id="psych-mse"
          label={t("mseLabel")}
          minHeightClassName="min-h-[140px]"
          readOnly={readOnly}
          placeholder={t("msePlaceholder")}
          value={mseNotes}
          onChange={(notes) =>
            setValue((prev) => ({
              ...prev,
              mse: {
                ...prev.mse,
                notes,
              },
            }))
          }
        />
        <ExamFieldGrid>
          <PsychiatryRiskSelectField
            label={t("suicideRiskLabel")}
            placeholder={t("suicideRiskPlaceholder")}
            readOnly={readOnly}
            value={value.riskAssessment?.suicideRisk}
            onChange={(suicideRisk) =>
              setValue((prev) => ({
                ...prev,
                riskAssessment: {
                  ...prev.riskAssessment,
                  suicideRisk,
                },
              }))
            }
          />
          <PsychiatryRiskSelectField
            label={t("homicideRiskLabel")}
            placeholder={t("homicideRiskPlaceholder")}
            readOnly={readOnly}
            value={value.riskAssessment?.homicideRisk}
            onChange={(homicideRisk) =>
              setValue((prev) => ({
                ...prev,
                riskAssessment: {
                  ...prev.riskAssessment,
                  homicideRisk,
                },
              }))
            }
          />
        </ExamFieldGrid>
        <ExamTextareaField
          id="psych-risk-mgmt"
          label={t("riskManagementLabel")}
          minHeightClassName="min-h-[88px]"
          readOnly={readOnly}
          placeholder={t("riskManagementPlaceholder")}
          value={value.riskAssessment?.riskManagement ?? ""}
          onChange={(riskManagement) =>
            setValue((prev) => ({
              ...prev,
              riskAssessment: {
                ...prev.riskAssessment,
                riskManagement,
              },
            }))
          }
        />
        <ExamAssessmentPlanFields
          idPrefix="psych"
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
  // jscpd:ignore-end
}
