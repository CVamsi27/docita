"use client";

import {
  usePortalActiveMedications,
  usePortalAdherence,
} from "@/hooks/api/use-patient-portal";
import { ActiveMedicationsCard } from "@/features/patient-portal/components/medications/active-medications-card";
import { DoseTracker } from "@/features/patient-portal/components/medications/dose-tracker";
import { AdherenceChart } from "@/features/patient-portal/components/medications/adherence-chart";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
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
      <div>
        <h1 className="text-3xl font-bold">My Medications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track your medications and monitor adherence.
        </p>
      </div>

      {adherence && adherence.totalDoses > 0 && (
        <AdherenceChart summary={adherence} label="Overall Medication Adherence" />
      )}

      <ActiveMedicationsCard medications={medications} />

      {scheduledMedications.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Scheduled Medications</h2>
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
          <h2 className="text-xl font-semibold">As-Needed Medications</h2>
          <p className="text-sm text-muted-foreground">
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!medications || medications.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Medications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track your medications and monitor adherence.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5" />
              No Active Medications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You have no active medications at the moment. Your prescribed
              medications will appear here.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <MedicationsContent medications={medications} />;
}
