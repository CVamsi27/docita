import { type Ref } from "react";
import { HeartPulse } from "lucide-react";
import { AllergyBanner, Button, Textarea, type AllergyEntry } from "@workspace/ui/components";
import { useTranslation } from "react-i18next";
import { useConsultationDraft } from "@/features/consultation/state/useConsultationDraft";
import { useConsultationSectionSubtitle, useConsultationWorkspace } from "@/features/consultation/workspace/consultation-workspace-context";
import { useConsultationVitals } from "@/features/consultation/workspace/consultation-vitals-context";
import { useSectionCompletion } from "@/features/consultation/workspace/chrome/SectionRail-sections";
import { ChiefComplaintInput } from "@/features/consultation/components/structured/ChiefComplaintInput";
import { DiagnosisInput } from "@/features/consultation/components/structured/DiagnosisInput";
import { ExaminationInput } from "@/features/consultation/components/structured/ExaminationInput";
import { PrescriptionInput } from "@/features/consultation/components/structured/PrescriptionInput";
import { SectionContainer } from "@/features/consultation/workspace/chrome/SectionContainer";
import { SectionField } from "@/features/consultation/workspace/chrome/SectionField";
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
  sectionRef?: Ref<HTMLElement>;
}

export function SubjectiveSection({ readOnly, sectionRef }: SectionProps) {
  const { t } = useTranslation("Consultation");
  const { clinicFeatures } = useConsultationWorkspace();
  const subtitle = useConsultationSectionSubtitle("subjective");
  const completion = useSectionCompletion();
  const chiefComplaint = useConsultationDraft((s) => s.chiefComplaint);
  const history = useConsultationDraft((s) => s.history);
  const setChiefComplaint = useConsultationDraft((s) => s.setChiefComplaint);
  const setHistory = useConsultationDraft((s) => s.setHistory);

  const complaintCount = chiefComplaint.filter((c) =>
    c.complaint?.trim(),
  ).length;
  const isComplete = Boolean(completion.subjective);

  return (
    <SectionContainer
      ref={sectionRef}
      id="subjective"
      letter="S"
      title={t("soapSections.subjectiveTitle")}
      subtitle={subtitle}
      description={t("soapSections.subjectiveDescription")}
      completed={isComplete}
    >
      {clinicFeatures.chiefComplaint ? (
        <SectionField
          title={t("soapSections.chiefComplaintsTitle")}
          meta={t("soapSections.chiefComplaintsMeta", { count: complaintCount })}
          hint={t("soapSections.chiefComplaintsHint")}
        >
          <ChiefComplaintInput
            value={chiefComplaint}
            onChange={setChiefComplaint}
            readOnly={readOnly}
          />
        </SectionField>
      ) : null}
      {clinicFeatures.history ? (
        <SectionField
          title={t("soapSections.hpiTitle")}
          htmlFor="hpi"
          hint={t("soapSections.hpiHint")}
        >
          <Textarea
            id="hpi"
            className="min-h-[120px]"
            placeholder={t("soapSections.hpiPlaceholder")}
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
  const { t } = useTranslation("Consultation");
  const { clinicFeatures } = useConsultationWorkspace();
  const subtitle = useConsultationSectionSubtitle("objective");
  const completion = useSectionCompletion();
  const { openVitals } = useConsultationVitals();
  const examination = useConsultationDraft((s) => s.examination);
  const setExamination = useConsultationDraft((s) => s.setExamination);
  const isComplete = Boolean(completion.objective);
  return (
    <SectionContainer
      ref={sectionRef}
      id="objective"
      letter="O"
      title={t("soapSections.objectiveTitle")}
      subtitle={subtitle}
      description={t("soapSections.objectiveDescription")}
      completed={isComplete}
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
            {t("soapSections.recordVitalsButton")}
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
  const { t } = useTranslation("Consultation");
  const subtitle = useConsultationSectionSubtitle("assessment");
  const completion = useSectionCompletion();
  const diagnosis = useConsultationDraft((s) => s.diagnosis);
  const setDiagnosis = useConsultationDraft((s) => s.setDiagnosis);
  const diagnosisCount = diagnosis.filter((d) =>
    d.condition?.trim(),
  ).length;
  const isComplete = Boolean(completion.assessment);
  return (
    <SectionContainer
      ref={sectionRef}
      id="assessment"
      letter="A"
      title={t("soapSections.assessmentTitle")}
      subtitle={subtitle}
      description={t("soapSections.assessmentDescription")}
      completed={isComplete}
    >
      <SectionField
        title={t("soapSections.diagnosesTitle")}
        meta={t("soapSections.diagnosesMeta", { count: diagnosisCount })}
        hint={t("soapSections.diagnosesHint")}
      >
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
  const { t } = useTranslation("Consultation");
  const subtitle = useConsultationSectionSubtitle("plan");
  const completion = useSectionCompletion();
  const prescriptions = useConsultationDraft((s) => s.prescriptions);
  const treatment = useConsultationDraft((s) => s.treatment);
  const followUpPlan = useConsultationDraft((s) => s.followUpPlan);
  const setPrescriptions = useConsultationDraft((s) => s.setPrescriptions);
  const setTreatment = useConsultationDraft((s) => s.setTreatment);
  const setFollowUpPlan = useConsultationDraft((s) => s.setFollowUpPlan);
  const allergyEntries = toAllergyEntries(patientAllergies);
  const isComplete = Boolean(completion.plan);
  return (
    <SectionContainer
      ref={sectionRef}
      id="plan"
      letter="P"
      title={t("soapSections.planTitle")}
      subtitle={subtitle}
      description={t("soapSections.planDescription")}
      completed={isComplete}
    >
      {allergyEntries.length > 0 ? (
        <AllergyBanner
          allergies={allergyEntries}
          severeTitle={t("soapSections.allergySevereTitle")}
          allergiesTitle={t("soapSections.allergyAllergiesTitle")}
        />
      ) : null}
      <SectionField
        title={t("soapSections.medicationsTitle")}
        meta={t("soapSections.medicationsMeta", { count: prescriptions.length })}
        hint={t("soapSections.medicationsHint")}
      >
        <PrescriptionInput
          value={prescriptions}
          onChange={setPrescriptions}
          readOnly={readOnly}
        />
      </SectionField>
      <div className="grid gap-3 md:grid-cols-2">
        <SectionField
          title={t("soapSections.treatmentTitle")}
          htmlFor="treatment-plan"
          hint={t("soapSections.treatmentHint")}
        >
          <Textarea
            id="treatment-plan"
            className="min-h-[110px]"
            placeholder={t("soapSections.treatmentPlaceholder")}
            value={treatment}
            readOnly={readOnly}
            onChange={(e) => setTreatment(e.target.value)}
          />
        </SectionField>
        <SectionField
          title={t("soapSections.followUpTitle")}
          htmlFor="follow-up-plan"
          hint={t("soapSections.followUpHint")}
        >
          <Textarea
            id="follow-up-plan"
            className="min-h-[110px]"
            placeholder={t("soapSections.followUpPlaceholder")}
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
