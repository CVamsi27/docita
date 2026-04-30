"use client";

import { use } from "react";
import { Feature } from "@workspace/types";
import { FeatureGate } from "@/features/_shared/components/auth/feature-gate";
import { usePatient } from "@/hooks/api/use-patients";
import { UnifiedTimelineContainer } from "@/features/patients/components/timeline/UnifiedTimelineContainer";
import { BackButton } from "@/components/common/navigation/back-button";

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
      <div className="flex-1 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <FeatureGate feature={Feature.BASIC_PATIENT_MANAGEMENT} showLockedCard>
      <div className="flex-1 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <BackButton
                fallback={`/patients/${patientId}`}
                label="Back to Patient"
              />
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-normal">Medical History</h1>
            <p className="text-muted-foreground">{patientName}</p>
          </div>
        </div>

        <UnifiedTimelineContainer patientId={patientId} />
      </div>
    </FeatureGate>
  );
}
