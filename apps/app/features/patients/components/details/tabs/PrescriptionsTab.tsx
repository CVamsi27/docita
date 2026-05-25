"use client";

import Link from "next/link";
import { formatDate } from "@workspace/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { ExternalLink, Pill, RotateCcw } from "lucide-react";
import { usePatientPrescriptions } from "@workspace/data-access";
import { useRepeatPrescription } from "@/features/patients/hooks/use-repeat-prescription";

interface PrescriptionsTabProps {
  patientId: string;
}

export function PrescriptionsTab({ patientId }: PrescriptionsTabProps) {
  const {
    data: prescriptions,
    isLoading,
    isError,
    refetch,
  } = usePatientPrescriptions(patientId);
  const { repeatPrescription } = useRepeatPrescription();

  if (isLoading) {
    return (
      <DataState status="loading" loadingMessage="Loading prescriptions…" />
    );
  }

  if (isError) {
    return (
      <DataState
        status="error"
        errorMessage="We could not load these prescriptions. Please try again."
        onRetry={() => refetch()}
      />
    );
  }

  if (!prescriptions || prescriptions.length === 0) {
    return (
      <DataState
        status="empty"
        emptyIcon={Pill}
        emptyTitle="No prescriptions yet"
        emptyDescription="Prescriptions issued to this patient will appear here."
      />
    );
  }

  const sorted = [...prescriptions].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className="space-y-3">
      {sorted.map((prescription) => {
        const date = prescription.createdAt
          ? formatDate(prescription.createdAt, "EEE, d MMM yyyy")
          : "";
        const medications = prescription.medications ?? [];
        const doctorName =
          prescription.doctor?.name ?? prescription.doctorName ?? "";
        const appointmentId = prescription.appointmentId;

        return (
          <Card key={prescription.id ?? `${date}-${doctorName}`}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Pill className="h-4 w-4 text-success" />
                    {date}
                  </CardTitle>
                  {doctorName && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Dr. {doctorName}
                    </p>
                  )}
                </div>
                <Badge variant="secondary" className="shrink-0 text-xs">
                  {medications.length}{" "}
                  {medications.length === 1 ? "medication" : "medications"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {prescription.diagnosis && (
                <div className="text-xs">
                  <span className="text-muted-foreground">Diagnosis: </span>
                  <span className="text-foreground">
                    {prescription.diagnosis}
                  </span>
                </div>
              )}

              {medications.length > 0 && (
                <div className="space-y-1">
                  {medications.slice(0, 4).map((med, i) => (
                    <div key={med.id ?? `${med.name}-${i}`} className="text-xs">
                      <span className="font-medium">{med.name}</span>
                      {med.dosage && (
                        <span className="text-muted-foreground">
                          {" "}
                          &middot; {med.dosage}
                        </span>
                      )}
                      {med.frequency && (
                        <span className="text-muted-foreground">
                          {" "}
                          &middot; {med.frequency}
                        </span>
                      )}
                      {med.duration && (
                        <span className="text-muted-foreground">
                          {" "}
                          &middot; {med.duration}
                        </span>
                      )}
                    </div>
                  ))}
                  {medications.length > 4 && (
                    <p className="text-xs text-muted-foreground">
                      +{medications.length - 4} more
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-2">
                {prescription.id && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                  >
                    <Link href={`/prescriptions/${prescription.id}`}>
                      <ExternalLink className="h-3 w-3 mr-1.5" />
                      View
                    </Link>
                  </Button>
                )}
                {appointmentId && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() =>
                      repeatPrescription(appointmentId, patientId)
                    }
                  >
                    <RotateCcw className="h-3 w-3 mr-1.5" />
                    Repeat
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
