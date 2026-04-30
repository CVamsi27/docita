"use client";

import { use } from "react";
import { Feature } from "@workspace/types";
import { FeatureGate } from "@/features/_shared/components/auth/feature-gate";
import { usePatient } from "@/hooks/api/use-patients";
import { UnifiedTimelineContainer } from "@/features/patients/components/timeline/UnifiedTimelineContainer";
import { BackButton } from "@/components/common/navigation/back-button";
import { AppPageScaffold } from "@workspace/ui/components/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/page-header";
import { LoadingState } from "@workspace/ui/components/empty-state";

interface PatientHistoryPageProps {
  params: Promise<{ id: string }>;
}

export default function PatientHistoryPage({
  params,
}: PatientHistoryPageProps) {
  const resolvedParams = use(params);
  const patientId = resolvedParams.id;

  const { data: patient, isLoading } = usePatient(patientId);
  const patientName = patient ? `${patient.firstName} ${patient.lastName}` : "";

  if (isLoading) {
    return (
      <AppPageScaffold>
        <LoadingState message="Loading medical history..." className="py-16" />
      </AppPageScaffold>
    );
  }

  return (
    <FeatureGate feature={Feature.BASIC_PATIENT_MANAGEMENT} showLockedCard>
      <AppPageScaffold
        header={
          <PageHeader
            breadcrumbs={
              <BackButton fallback={`/patients/${patientId}`} label="Back to Patient" />
            }
            title="Medical History"
            description={patientName || undefined}
          />
        }
      >
        <UnifiedTimelineContainer patientId={patientId} />
      </AppPageScaffold>
    </FeatureGate>
  );
}
