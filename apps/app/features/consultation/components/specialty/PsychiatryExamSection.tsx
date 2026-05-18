"use client";

import { Label } from "@workspace/ui/components/form/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { Textarea } from "@workspace/ui/components/form/textarea";
import { useConsultationDraft } from "@/features/consultation/state/useConsultationDraft";
import { SectionContainer } from "@/features/consultation/workspace/chrome/SectionContainer";
import { useConsultationSectionSubtitle } from "@/features/consultation/workspace/consultation-workspace-context";
import type { PsychiatryExamData } from "@workspace/types";

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
        <div className="space-y-2">
          <Label htmlFor="psych-mse" className="text-sm font-semibold">
            Mental status examination
          </Label>
          <Textarea
            id="psych-mse"
            className="min-h-[140px]"
            readOnly={readOnly}
            placeholder="Mental status examination"
            value={mseNotes}
            onChange={(e) =>
              setValue((prev) => ({
                ...prev,
                mse: {
                  ...prev.mse,
                  notes: e.target.value,
                },
              }))
            }
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Suicide risk</Label>
            <Select
              disabled={readOnly}
              value={value.riskAssessment?.suicideRisk ?? "unset"}
              onValueChange={(suicideRisk) =>
                setValue((prev) => ({
                  ...prev,
                  riskAssessment: {
                    ...prev.riskAssessment,
                    suicideRisk:
                      suicideRisk === "unset"
                        ? undefined
                        : (suicideRisk as NonNullable<
                            PsychiatryExamData["riskAssessment"]
                          >["suicideRisk"]),
                  },
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Suicide risk" />
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
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Homicide risk</Label>
            <Select
              disabled={readOnly}
              value={value.riskAssessment?.homicideRisk ?? "unset"}
              onValueChange={(homicideRisk) =>
                setValue((prev) => ({
                  ...prev,
                  riskAssessment: {
                    ...prev.riskAssessment,
                    homicideRisk:
                      homicideRisk === "unset"
                        ? undefined
                        : (homicideRisk as NonNullable<
                            PsychiatryExamData["riskAssessment"]
                          >["homicideRisk"]),
                  },
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Homicide risk" />
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
        </div>
        <div className="space-y-2">
          <Label htmlFor="psych-risk-mgmt" className="text-sm font-semibold">
            Risk management / safety plan
          </Label>
          <Textarea
            id="psych-risk-mgmt"
            className="min-h-[88px]"
            readOnly={readOnly}
            placeholder="Safety plan"
            value={value.riskAssessment?.riskManagement ?? ""}
            onChange={(e) =>
              setValue((prev) => ({
                ...prev,
                riskAssessment: {
                  ...prev.riskAssessment,
                  riskManagement: e.target.value,
                },
              }))
            }
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="psych-assessment" className="text-sm font-semibold">
              Clinical assessment
            </Label>
            <Textarea
              id="psych-assessment"
              className="min-h-[100px]"
              readOnly={readOnly}
              value={value.clinicalAssessment ?? ""}
              onChange={(e) => patch({ clinicalAssessment: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="psych-plan" className="text-sm font-semibold">
              Plan
            </Label>
            <Textarea
              id="psych-plan"
              className="min-h-[100px]"
              readOnly={readOnly}
              value={value.plan ?? ""}
              onChange={(e) => patch({ plan: e.target.value })}
            />
          </div>
        </div>
      </div>
    </SectionContainer>
  );
}
