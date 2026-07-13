"use client";

import type { PatientWithMedicalHistory } from "@workspace/types";
import { ClinicalOverviewSection } from "@/features/patients/components/details/summary/ClinicalOverviewSection";
import { LatestVitalsSection } from "@/features/patients/components/details/summary/LatestVitalsSection";
import { MedicalHistorySection } from "@/features/patients/components/details/summary/MedicalHistorySection";
import { OngoingMedicationsSection } from "@/features/patients/components/details/summary/OngoingMedicationsSection";
import { RecentConsultationsSection } from "@/features/patients/components/details/summary/RecentConsultationsSection";
import { AbdmExternalRecordsSection } from "@/features/patients/components/details/summary/AbdmExternalRecordsSection";

interface SummaryTabProps {
  patient: PatientWithMedicalHistory;
  patientId: string;
}

export function SummaryTab({ patient, patientId }: SummaryTabProps) {
  return (
    <div className="space-y-4">
      <ClinicalOverviewSection patientId={patientId} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
        <OngoingMedicationsSection patientId={patientId} />
        <LatestVitalsSection patientId={patientId} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <MedicalHistorySection patient={patient} patientId={patientId} />
        <RecentConsultationsSection patientId={patientId} />
      </div>
      <AbdmExternalRecordsSection />
    </div>
  );
}
