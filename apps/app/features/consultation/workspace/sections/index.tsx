"use client";

import { HeartPulse } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { Textarea } from "@workspace/ui/components/form/textarea";
import { useConsultationDraft } from "@/features/consultation/state/useConsultationDraft";
import {
  useConsultationSectionSubtitle,
  useConsultationWorkspace,
} from "@/features/consultation/workspace/consultation-workspace-context";
import { useConsultationVitals } from "@/features/consultation/workspace/consultation-vitals-context";
import { ChiefComplaintInput } from "@/features/consultation/components/structured/ChiefComplaintInput";
import { DiagnosisInput } from "@/features/consultation/components/structured/DiagnosisInput";
import { ExaminationInput } from "@/features/consultation/components/structured/ExaminationInput";
import { PrescriptionInput } from "@/features/consultation/components/structured/PrescriptionInput";
import { SectionContainer } from "@/features/consultation/workspace/chrome/SectionContainer";
import { SectionField } from "@/features/consultation/workspace/chrome/SectionField";
import {
  AllergyBanner,
  type AllergyEntry,
} from "@workspace/ui/components/feedback/allergy-banner";
import type { PatientAllergy } from "@workspace/types";

/** Maps a stored allergy severity to the {@link AllergyBanner} severity scale. */
function toBannerAllergySeverity(
  severity?: string | null,
): AllergyEntry["severity"] {
  const value = (severity ?? "").toUpperCase();
  if (value === "SEVERE" || value === "LIFE_THREATENING") return "severe";
  if (value === "MILD") return "mild";
  if (value === "MODERATE") return "moderate";
  return undefined;
}

function toAllergyEntries(
  allergies: readonly PatientAllergy[] | undefined,
): AllergyEntry[] {
  return (allergies ?? [])
    .filter((allergy) => allergy.allergen?.trim())
    .map((allergy) => ({
      allergen: allergy.allergen,
      severity: toBannerAllergySeverity(allergy.severity),
      reaction: allergy.reaction ?? undefined,
    }));
}

interface SectionProps {
  readOnly?: boolean;
  sectionRef?: React.Ref<HTMLElement>;
}

export function SubjectiveSection({ readOnly, sectionRef }: SectionProps) {
  const { clinicFeatures } = useConsultationWorkspace();
  const subtitle = useConsultationSectionSubtitle("subjective");
  const chiefComplaint = useConsultationDraft((s) => s.chiefComplaint);
  const history = useConsultationDraft((s) => s.history);
  const setChiefComplaint = useConsultationDraft((s) => s.setChiefComplaint);
  const setHistory = useConsultationDraft((s) => s.setHistory);

  const complaintCount = chiefComplaint.filter((c) =>
    c.complaint?.trim(),
  ).length;

  return (
    <SectionContainer
      ref={sectionRef}
      id="subjective"
      letter="S"
      title="Subjective"
      subtitle={subtitle}
    >
      {clinicFeatures.chiefComplaint ? (
        <SectionField
          title="Chief complaints"
          meta={`${complaintCount} recorded`}
        >
          <ChiefComplaintInput
            value={chiefComplaint}
            onChange={setChiefComplaint}
            readOnly={readOnly}
          />
        </SectionField>
      ) : null}
      {clinicFeatures.history ? (
        <SectionField title="History of present illness" htmlFor="hpi">
          <Textarea
            id="hpi"
            className="min-h-[120px]"
            placeholder="Onset, progression, and associated symptoms…"
            value={history}
            readOnly={readOnly}
            onChange={(e) => setHistory(e.target.value)}
          />
        </SectionField>
      ) : null}
    </SectionContainer>
  );
}

export function ObjectiveSection({ readOnly, sectionRef }: SectionProps) {
  const { clinicFeatures } = useConsultationWorkspace();
  const subtitle = useConsultationSectionSubtitle("objective");
  const { openVitals } = useConsultationVitals();
  const examination = useConsultationDraft((s) => s.examination);
  const setExamination = useConsultationDraft((s) => s.setExamination);
  return (
    <SectionContainer
      ref={sectionRef}
      id="objective"
      letter="O"
      title="Objective"
      subtitle={subtitle}
      actions={
        clinicFeatures.vitals && !readOnly ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0"
            onClick={() => openVitals()}
          >
            <HeartPulse className="h-3.5 w-3.5 text-destructive" aria-hidden />
            Record vitals
          </Button>
        ) : undefined
      }
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
  const subtitle = useConsultationSectionSubtitle("assessment");
  const diagnosis = useConsultationDraft((s) => s.diagnosis);
  const setDiagnosis = useConsultationDraft((s) => s.setDiagnosis);
  const diagnosisCount = diagnosis.filter((d) =>
    d.condition?.trim(),
  ).length;
  return (
    <SectionContainer
      ref={sectionRef}
      id="assessment"
      letter="A"
      title="Assessment"
      subtitle={subtitle}
    >
      <SectionField title="Diagnoses" meta={`${diagnosisCount} recorded`}>
        <DiagnosisInput
          value={diagnosis}
          onChange={setDiagnosis}
          readOnly={readOnly}
        />
      </SectionField>
    </SectionContainer>
  );
}

export function PlanSection({
  readOnly,
  sectionRef,
  patientAllergies,
}: SectionProps & { patientAllergies?: PatientAllergy[] }) {
  const subtitle = useConsultationSectionSubtitle("plan");
  const prescriptions = useConsultationDraft((s) => s.prescriptions);
  const treatment = useConsultationDraft((s) => s.treatment);
  const followUpPlan = useConsultationDraft((s) => s.followUpPlan);
  const setPrescriptions = useConsultationDraft((s) => s.setPrescriptions);
  const setTreatment = useConsultationDraft((s) => s.setTreatment);
  const setFollowUpPlan = useConsultationDraft((s) => s.setFollowUpPlan);
  const allergyEntries = toAllergyEntries(patientAllergies);
  return (
    <SectionContainer
      ref={sectionRef}
      id="plan"
      letter="P"
      title="Plan"
      subtitle={subtitle}
    >
      {allergyEntries.length > 0 ? (
        <AllergyBanner allergies={allergyEntries} />
      ) : null}
      <SectionField
        title="Medications"
        meta={`${prescriptions.length} added`}
      >
        <PrescriptionInput
          value={prescriptions}
          onChange={setPrescriptions}
          readOnly={readOnly}
        />
      </SectionField>
      <div className="grid gap-3 md:grid-cols-2">
        <SectionField title="Treatment notes" htmlFor="treatment-plan">
          <Textarea
            id="treatment-plan"
            className="min-h-[110px]"
            placeholder="Advice, procedures, and treatment given…"
            value={treatment}
            readOnly={readOnly}
            onChange={(e) => setTreatment(e.target.value)}
          />
        </SectionField>
        <SectionField title="Follow-up plan" htmlFor="follow-up-plan">
          <Textarea
            id="follow-up-plan"
            className="min-h-[110px]"
            placeholder="When to return and what to watch for…"
            value={followUpPlan}
            readOnly={readOnly}
            onChange={(e) => setFollowUpPlan(e.target.value)}
          />
        </SectionField>
      </div>
    </SectionContainer>
  );
}

export {
  DentalSpecialtySection,
  VisionSpecialtySection,
  GrowthSpecialtySection,
  CardiologyExamSection,
  DermatologyExamSection,
  GynecologyExamSection,
  PsychiatryExamSection,
  InvestigationsSection,
} from "./specialty-sections";
