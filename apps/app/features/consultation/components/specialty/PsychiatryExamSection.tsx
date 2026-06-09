"use client";

// jscpd:ignore-start
import { Label } from "@workspace/ui/components/form/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { useConsultationDraft } from "@/features/consultation/state/useConsultationDraft";
import { SectionContainer } from "@/features/consultation/workspace/chrome/SectionContainer";
import { useConsultationSectionSubtitle } from "@/features/consultation/workspace/consultation-workspace-context";
import { z } from "zod";
import type { PsychiatryExamData } from "@workspace/types";
import {
  ExamAssessmentPlanFields,
// jscpd:ignore-end
  ExamFieldGrid,
  ExamTextareaField,
} from "./exam-section-fields";

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
          <SelectItem value="unset">Not assessed</SelectItem>
          <SelectItem value="low">Low</SelectItem>
          <SelectItem value="moderate">Moderate</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="imminent">Imminent</SelectItem>
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
      title="Mental Status Examination"
      subtitle={subtitle}
      description="MSE, risk assessment, and psychiatric plan."
    >
      <div className="space-y-4">
        <ExamTextareaField
          id="psych-mse"
          label="Mental status examination"
          minHeightClassName="min-h-[140px]"
          readOnly={readOnly}
          placeholder="Mental status examination"
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
            label="Suicide risk"
            placeholder="Suicide risk"
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
            label="Homicide risk"
            placeholder="Homicide risk"
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
          label="Risk management / safety plan"
          minHeightClassName="min-h-[88px]"
          readOnly={readOnly}
          placeholder="Safety plan"
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
