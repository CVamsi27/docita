"use client";

import dynamic from "next/dynamic";
import { Textarea } from "@workspace/ui/components/textarea";
import { Label } from "@workspace/ui/components/label";
import { useConsultationDraft } from "@/features/consultation/state/useConsultationDraft";
import { ChiefComplaintInput } from "@/features/consultation/components/structured/ChiefComplaintInput";
import { DiagnosisInput } from "@/features/consultation/components/structured/DiagnosisInput";
import { ExaminationInput } from "@/features/consultation/components/structured/ExaminationInput";
import { PrescriptionInput } from "@/features/consultation/components/structured/PrescriptionInput";
import { SectionContainer } from "@/features/consultation/workspace/chrome/SectionContainer";
import { logger as _logger } from "@/lib/logger";
import type { PatientWithMedicalHistory } from "@workspace/types";

void _logger;

function SectionLoading() {
  return (
    <div className="flex items-center justify-center p-8">
      <div
        className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"
        aria-hidden="true"
      />
      <span className="sr-only">Loading</span>
    </div>
  );
}

const DentalChartUILazy = dynamic(
  () =>
    import("@/features/consultation/components/specialty/DentalChartUI").then(
      (m) => m.DentalChartUI,
    ),
  { ssr: false, loading: SectionLoading },
);
const GrowthChartUILazy = dynamic(
  () =>
    import("@/features/consultation/components/specialty/GrowthChartUI").then(
      (m) => m.GrowthChartUI,
    ),
  { ssr: false, loading: SectionLoading },
);
const VisionExamUILazy = dynamic(
  () =>
    import("@/features/consultation/components/specialty/VisionExamUI").then(
      (m) => m.VisionExamUI,
    ),
  { ssr: false, loading: SectionLoading },
);
const PatientMedicalHistoryContainerLazy = dynamic(
  () =>
    import(
      "@/features/patients/components/details/PatientMedicalHistoryContainer"
    ).then((m) => m.PatientMedicalHistoryContainer),
  { ssr: false, loading: SectionLoading },
);

interface SectionProps {
  readOnly?: boolean;
  sectionRef?: React.Ref<HTMLElement>;
}

export function SubjectiveSection({
  readOnly,
  sectionRef,
  patient,
  patientLoading,
}: SectionProps & {
  patient?: PatientWithMedicalHistory;
  patientLoading?: boolean;
}) {
  const chiefComplaint = useConsultationDraft((s) => s.chiefComplaint);
  const history = useConsultationDraft((s) => s.history);
  const setChiefComplaint = useConsultationDraft((s) => s.setChiefComplaint);
  const setHistory = useConsultationDraft((s) => s.setHistory);

  return (
    <SectionContainer
      ref={sectionRef}
      id="subjective"
      letter="S"
      title="Subjective"
      description="What the patient reports: complaints, duration, history of present illness."
    >
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">Chief complaints</h3>
          <span className="text-xs text-muted-foreground">
            {chiefComplaint.filter((c) => c.complaint?.trim()).length} recorded
          </span>
        </div>
        <ChiefComplaintInput
          value={chiefComplaint}
          onChange={setChiefComplaint}
          readOnly={readOnly}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="hpi" className="text-sm font-semibold">
          History of present illness
        </Label>
        <Textarea
          id="hpi"
          className="min-h-[120px]"
          placeholder="Onset, progression, aggravating/relieving factors, associated symptoms..."
          value={history}
          readOnly={readOnly}
          onChange={(e) => setHistory(e.target.value)}
        />
      </div>

      <details className="rounded-xl border bg-muted/10 p-3">
        <summary className="cursor-pointer text-sm font-semibold">
          Past medical history
        </summary>
        <div className="mt-3">
          {patientLoading && !patient ? (
            <SectionLoading />
          ) : patient ? (
            <PatientMedicalHistoryContainerLazy
              patient={patient}
              readOnly={readOnly}
              variant="consultation"
            />
          ) : (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              Could not load this patient&apos;s medical history.
            </div>
          )}
        </div>
      </details>
    </SectionContainer>
  );
}

export function ObjectiveSection({ readOnly, sectionRef }: SectionProps) {
  const examination = useConsultationDraft((s) => s.examination);
  const setExamination = useConsultationDraft((s) => s.setExamination);

  return (
    <SectionContainer
      ref={sectionRef}
      id="objective"
      letter="O"
      title="Objective"
      description="Observable findings: general and systemic examination."
    >
      <ExaminationInput
        value={examination}
        onChange={setExamination}
        readOnly={readOnly}
      />
    </SectionContainer>
  );
}

export function AssessmentSection({ readOnly, sectionRef }: SectionProps) {
  const diagnosis = useConsultationDraft((s) => s.diagnosis);
  const setDiagnosis = useConsultationDraft((s) => s.setDiagnosis);

  return (
    <SectionContainer
      ref={sectionRef}
      id="assessment"
      letter="A"
      title="Assessment"
      description="Working diagnoses with ICD codes and clinical reasoning."
    >
      <DiagnosisInput
        value={diagnosis}
        onChange={setDiagnosis}
        readOnly={readOnly}
      />
    </SectionContainer>
  );
}

export function PlanSection({ readOnly, sectionRef }: SectionProps) {
  const prescriptions = useConsultationDraft((s) => s.prescriptions);
  const treatment = useConsultationDraft((s) => s.treatment);
  const followUpPlan = useConsultationDraft((s) => s.followUpPlan);
  const setPrescriptions = useConsultationDraft((s) => s.setPrescriptions);
  const setTreatment = useConsultationDraft((s) => s.setTreatment);
  const setFollowUpPlan = useConsultationDraft((s) => s.setFollowUpPlan);

  return (
    <SectionContainer
      ref={sectionRef}
      id="plan"
      letter="P"
      title="Plan"
      description="Prescriptions, investigations, follow-up, patient instructions."
    >
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Medications</h3>
        <PrescriptionInput
          value={prescriptions}
          onChange={setPrescriptions}
          readOnly={readOnly}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="treatment-plan" className="text-sm font-semibold">
            Treatment notes
          </Label>
          <Textarea
            id="treatment-plan"
            className="min-h-[110px]"
            placeholder="Investigations, referrals, procedures, patient instructions..."
            value={treatment}
            readOnly={readOnly}
            onChange={(e) => setTreatment(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="follow-up-plan" className="text-sm font-semibold">
            Follow-up plan
          </Label>
          <Textarea
            id="follow-up-plan"
            className="min-h-[110px]"
            placeholder="When to return, red flags, review schedule..."
            value={followUpPlan}
            readOnly={readOnly}
            onChange={(e) => setFollowUpPlan(e.target.value)}
          />
        </div>
      </div>
    </SectionContainer>
  );
}

export function DentalSpecialtySection({
  readOnly,
  sectionRef,
}: SectionProps) {
  const dentalChart = useConsultationDraft((s) => s.dentalChart);
  const setDentalChart = useConsultationDraft((s) => s.setDentalChart);
  return (
    <SectionContainer
      ref={sectionRef}
      id="specialty-dental"
      letter="D"
      title="Dental Chart"
      description="Per-tooth charting with notes."
    >
      <DentalChartUILazy
        value={dentalChart}
        onChange={setDentalChart}
        readOnly={readOnly}
      />
    </SectionContainer>
  );
}

export function VisionSpecialtySection({
  readOnly,
  sectionRef,
}: SectionProps) {
  const eyeExam = useConsultationDraft((s) => s.eyeExam);
  const setEyeExam = useConsultationDraft((s) => s.setEyeExam);
  return (
    <SectionContainer
      ref={sectionRef}
      id="specialty-vision"
      letter="V"
      title="Vision Exam"
      description="Refraction, IOP, anterior and posterior segment findings."
    >
      <VisionExamUILazy
        value={eyeExam}
        onChange={setEyeExam}
        readOnly={readOnly}
      />
    </SectionContainer>
  );
}

export function GrowthSpecialtySection({
  readOnly,
  sectionRef,
}: SectionProps) {
  const growthData = useConsultationDraft((s) => s.growthData);
  const setGrowthData = useConsultationDraft((s) => s.setGrowthData);
  return (
    <SectionContainer
      ref={sectionRef}
      id="specialty-growth"
      letter="G"
      title="Growth Chart"
      description="Anthropometric measurements plotted against WHO references."
    >
      <GrowthChartUILazy
        value={growthData}
        onChange={setGrowthData}
        readOnly={readOnly}
      />
    </SectionContainer>
  );
}
