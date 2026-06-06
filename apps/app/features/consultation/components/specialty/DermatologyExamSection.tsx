"use client";

import { Label } from "@workspace/ui/components/form/label";
import { Textarea } from "@workspace/ui/components/form/textarea";
import { useConsultationDraft } from "@/features/consultation/state/useConsultationDraft";
import { SectionContainer } from "@/features/consultation/workspace/chrome/SectionContainer";
import { useConsultationSectionSubtitle } from "@/features/consultation/workspace/consultation-workspace-context";
import type { DermatologyExamData } from "@workspace/types";

interface DermatologyExamSectionProps {
  readOnly?: boolean;
  sectionRef?: React.Ref<HTMLElement>;
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
        <div className="space-y-2">
          <Label htmlFor="derm-skin" className="text-sm font-semibold">
            Skin examination
          </Label>
          <Textarea
            id="derm-skin"
            className="min-h-[120px]"
            readOnly={readOnly}
            placeholder="Skin examination"
            value={skinNotes}
            onChange={(e) =>
              setValue((prev) => ({
                ...prev,
                skinAssessment: {
                  ...prev.skinAssessment,
                  generalCondition: e.target.value,
                },
              }))
            }
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="derm-assessment" className="text-sm font-semibold">
              Clinical assessment
            </Label>
            <Textarea
              id="derm-assessment"
              className="min-h-[100px]"
              readOnly={readOnly}
              placeholder="Clinical assessment"
              value={value.clinicalAssessment ?? ""}
              onChange={(e) => patch({ clinicalAssessment: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="derm-plan" className="text-sm font-semibold">
              Plan
            </Label>
            <Textarea
              id="derm-plan"
              className="min-h-[100px]"
              readOnly={readOnly}
              placeholder="Plan"
              value={value.plan ?? ""}
              onChange={(e) => patch({ plan: e.target.value })}
            />
          </div>
        </div>
      </div>
    </SectionContainer>
  );
}
