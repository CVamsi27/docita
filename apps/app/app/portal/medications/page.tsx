"use client";

import {
  usePortalActiveMedications,
  usePortalAdherence,
} from "@workspace/data-access";
import { ActiveMedicationsCard } from "@/features/patient-portal/components/medications/active-medications-card";
import { DoseTracker } from "@/features/patient-portal/components/medications/dose-tracker";
import { AdherenceChart } from "@/features/patient-portal/components/medications/adherence-chart";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { Pill } from "lucide-react";
import type { ActiveMedication } from "@workspace/types";

function MedicationsContent({
  medications,
}: {
  medications: ActiveMedication[];
}) {
  const { data: adherence } = usePortalAdherence();
  const scheduledMedications = medications.filter((m) => !m.isPRN);
  const prnMedications = medications.filter((m) => m.isPRN);
  return (
    <div className="space-y-6">
      {adherence && adherence.totalDoses > 0 && (
        <AdherenceChart
          summary={adherence}
          label="Overall Medication Adherence"
        />
      )}
      <ActiveMedicationsCard medications={medications} />
      {scheduledMedications.length > 0 && (
        <div className="space-y-4">
          <h2 className="ui-section-title text-[var(--fs-xl)]">
            Scheduled Medications
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {scheduledMedications.map((med) => (
              <DoseTracker
                key={med.medicationId}
                medicationId={med.medicationId}
                medicationName={med.name}
                prescriptionId={med.prescriptionId}
              />
            ))}
          </div>
        </div>
      )}

      {prnMedications.length > 0 && (
        <div className="space-y-4">
          <h2 className="ui-section-title text-[var(--fs-xl)]">
            As-Needed Medications
          </h2>
          <p className="ui-page-subtitle">
            Log doses when you take these medications.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {prnMedications.map((med) => (
              <DoseTracker
                key={med.medicationId}
                medicationId={med.medicationId}
                medicationName={med.name}
                prescriptionId={med.prescriptionId}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PortalMedicationsPage() {
  const { data: medications, isLoading } = usePortalActiveMedications();

  const state = isLoading
    ? "loading"
    : !medications || medications.length === 0
      ? "empty"
      : "success";

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="My Medications"
          description="Track your medications and monitor adherence"
        />
      }
    >
      <DataState
        status={state}
        loadingMessage="Loading medications…"
        emptyIcon={Pill}
        emptyTitle="No Active Medications"
        emptyDescription="You have no active medications at the moment"
      >
        <MedicationsContent medications={medications ?? []} />
      </DataState>
    </AppPageScaffold>
  );
}
