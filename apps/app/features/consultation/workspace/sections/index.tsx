"use client";

import dynamic from "next/dynamic";
import { HeartPulse } from "lucide-react";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { Skeleton } from "@workspace/ui/components/feedback/skeleton";
import { Button } from "@workspace/ui/components/form/button";
import { Textarea } from "@workspace/ui/components/form/textarea";
import { Label } from "@workspace/ui/components/form/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/overlay/collapsible";
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
import {
  AllergyBanner,
  type AllergyEntry,
} from "@workspace/ui/components/feedback/allergy-banner";
import type {
  PatientAllergy,
  PatientWithMedicalHistory,
} from "@workspace/types";

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

function SectionLoading() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 p-8"
      role="status"
      aria-label="Loading consultation section"
      aria-live="polite"
    >
      <DocitaLoadingIndicator
        variant="section"
        withStatusRole={false}
        iconClassName="h-8 w-8"
      />
      <Skeleton className="h-3 w-40 max-w-full" />
    </div>
  );
}

const PatientMedicalHistoryContainerLazy = dynamic(
  () =>
    import("@/features/patients/components/details/PatientMedicalHistoryContainer").then(
      (m) => m.PatientMedicalHistoryContainer,
    ),
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
  const { clinicFeatures } = useConsultationWorkspace();
  const subtitle = useConsultationSectionSubtitle("subjective");
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
      subtitle={subtitle}
    >
      {clinicFeatures.chiefComplaint ? (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-semibold">Chief complaints</h3>
            <span className="text-xs text-muted-foreground">
              {chiefComplaint.filter((c) => c.complaint?.trim()).length}{" "}
              recorded
            </span>
          </div>
          <ChiefComplaintInput
            value={chiefComplaint}
            onChange={setChiefComplaint}
            readOnly={readOnly}
          />
        </div>
      ) : null}
      {clinicFeatures.history ? (
        <div className="space-y-2">
          <Label htmlFor="hpi" className="text-sm font-semibold">
            History of present illness
          </Label>
          <Textarea
            id="hpi"
            className="min-h-[120px]"
            placeholder="Enter history of present illness"
            value={history}
            readOnly={readOnly}
            onChange={(e) => setHistory(e.target.value)}
          />
        </div>
      ) : null}
      <Collapsible className="rounded-lg border bg-muted/10 p-3">
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="h-auto w-full justify-start p-0 text-sm font-semibold hover:bg-transparent"
          >
            Past medical history
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
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
        </CollapsibleContent>
      </Collapsible>
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
  return (
    <SectionContainer
      ref={sectionRef}
      id="assessment"
      letter="A"
      title="Assessment"
      subtitle={subtitle}
    >
      <DiagnosisInput
        value={diagnosis}
        onChange={setDiagnosis}
        readOnly={readOnly}
      />
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
            placeholder="Enter plan"
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
            placeholder="Enter follow-up instructions"
            value={followUpPlan}
            readOnly={readOnly}
            onChange={(e) => setFollowUpPlan(e.target.value)}
          />
        </div>
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
