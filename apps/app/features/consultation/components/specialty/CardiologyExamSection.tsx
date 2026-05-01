"use client";

import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { useConsultationDraft } from "@/features/consultation/state/useConsultationDraft";
import { SectionContainer } from "@/features/consultation/workspace/chrome/SectionContainer";
import type { CardiologyExamData } from "@workspace/types";

interface CardiologyExamSectionProps {
  readOnly?: boolean;
  sectionRef?: React.Ref<HTMLElement>;
}

export function CardiologyExamSection({
  readOnly,
  sectionRef,
}: CardiologyExamSectionProps) {
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
      title="Cardiology Exam"
      description="Cardiac assessment, ECG or imaging summaries, and follow-up plan."
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cardio-assessment" className="text-sm font-semibold">
            Clinical assessment
          </Label>
          <Textarea
            id="cardio-assessment"
            className="min-h-[100px]"
            readOnly={readOnly}
            placeholder="Symptoms, functional class, exam highlights..."
            value={value.clinicalAssessment ?? ""}
            onChange={(e) => patch({ clinicalAssessment: e.target.value })}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cardio-risk" className="text-sm font-semibold">
              Risk factors
            </Label>
            <Textarea
              id="cardio-risk"
              className="min-h-[88px]"
              readOnly={readOnly}
              placeholder="HTN, DM, smoking, family history..."
              value={value.riskFactors ?? ""}
              onChange={(e) => patch({ riskFactors: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cardio-meds" className="text-sm font-semibold">
              Cardiac medications
            </Label>
            <Textarea
              id="cardio-meds"
              className="min-h-[88px]"
              readOnly={readOnly}
              placeholder="Antiplatelets, beta blockers, ACE-I..."
              value={value.medications ?? ""}
              onChange={(e) => patch({ medications: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="cardio-ecg" className="text-sm font-semibold">
            ECG / monitoring notes
          </Label>
          <Textarea
            id="cardio-ecg"
            className="min-h-[88px]"
            readOnly={readOnly}
            placeholder="Rhythm, intervals, ischemia, comparison to prior..."
            value={
              value.ecg?.interpretation ??
              value.ecg?.findings ??
              ""
            }
            onChange={(e) =>
              setValue((prev) => ({
                ...prev,
                ecg: {
                  ...prev.ecg,
                  interpretation: e.target.value,
                },
              }))
            }
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cardio-plan" className="text-sm font-semibold">
              Plan
            </Label>
            <Textarea
              id="cardio-plan"
              className="min-h-[88px]"
              readOnly={readOnly}
              placeholder="Medication changes, referrals, tests..."
              value={value.plan ?? ""}
              onChange={(e) => patch({ plan: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cardio-notes" className="text-sm font-semibold">
              General notes
            </Label>
            <Textarea
              id="cardio-notes"
              className="min-h-[88px]"
              readOnly={readOnly}
              placeholder="Additional documentation..."
              value={value.generalNotes ?? ""}
              onChange={(e) => patch({ generalNotes: e.target.value })}
            />
          </div>
        </div>
      </div>
    </SectionContainer>
  );
}
