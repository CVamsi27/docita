"use client";

import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { useConsultationDraft } from "@/features/consultation/state/useConsultationDraft";
import { SectionContainer } from "@/features/consultation/workspace/chrome/SectionContainer";
import { useConsultationSectionSubtitle } from "@/features/consultation/workspace/consultation-workspace-context";
import type { GynecologyExamData } from "@workspace/types";

interface GynecologyExamSectionProps {
  readOnly?: boolean;
  sectionRef?: React.Ref<HTMLElement>;
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
        <div className="space-y-2">
          <Label htmlFor="gyn-lmp" className="text-sm font-semibold">
            Last menstrual period (LMP)
          </Label>
          <Textarea
            id="gyn-lmp"
            className="min-h-[72px]"
            readOnly={readOnly}
            placeholder="Last menstrual period"
            value={lmp}
            onChange={(e) =>
              setValue((prev) => ({
                ...prev,
                menstrualHistory: {
                  ...prev.menstrualHistory,
                  lmp: e.target.value,
                },
              }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gyn-antenatal" className="text-sm font-semibold">
            Antenatal / pregnancy notes
          </Label>
          <Textarea
            id="gyn-antenatal"
            className="min-h-[100px]"
            readOnly={readOnly}
            placeholder="Antenatal notes"
            value={value.antenatalRecord?.notes ?? ""}
            onChange={(e) =>
              setValue((prev) => ({
                ...prev,
                antenatalRecord: {
                  ...prev.antenatalRecord,
                  notes: e.target.value,
                },
              }))
            }
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="gyn-assessment" className="text-sm font-semibold">
              Clinical assessment
            </Label>
            <Textarea
              id="gyn-assessment"
              className="min-h-[100px]"
              readOnly={readOnly}
              value={value.clinicalAssessment ?? ""}
              onChange={(e) => patch({ clinicalAssessment: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gyn-plan" className="text-sm font-semibold">
              Plan
            </Label>
            <Textarea
              id="gyn-plan"
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
