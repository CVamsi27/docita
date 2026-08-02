import { PatientHistorySummaryCard } from "@/components/patient-history/PatientHistorySummaryCard";
import { Section } from "@workspace/ui/components/layout/section";
import type { PatientWithMedicalHistory } from "@workspace/types";
import { SummarySectionAction } from "./SummarySectionAction";

interface MedicalHistorySectionProps {
  patient: PatientWithMedicalHistory;
  patientId: string;
}

export function MedicalHistorySection({
  patient,
  patientId,
}: MedicalHistorySectionProps) {
  return (
    <Section
      title="Medical history"
      description="Surgical, family, and social context."
      actions={
        <SummarySectionAction
          href={`/patients/${patientId}?tab=records&subtab=history`}
          label="Edit medical history"
        />
      }
    >
      <PatientHistorySummaryCard
        surgeries={patient.surgicalHistory}
        familyHistory={patient.familyHistory}
        socialHistory={patient.socialHistory}
        compact
        showClinicalHistory={false}
      />
    </Section>
  );
}
