"use client";

import { useActiveMedications } from "@workspace/data-access";
import { Badge, DataState, Progress, Section, type DataStateStatus } from "@workspace/ui/components";
import { Pill } from "lucide-react";
import { SummarySectionAction } from "./SummarySectionAction";

interface OngoingMedicationsSectionProps {
  patientId: string;
}

const clampPercentage = (value: number): number =>
  Math.max(0, Math.min(100, value));

export function OngoingMedicationsSection({
  patientId,
}: OngoingMedicationsSectionProps) {
  const {
    data: medications,
    isLoading,
    isError,
    refetch,
  } = useActiveMedications(patientId);

  const status: DataStateStatus =
    isLoading && !medications
      ? "loading"
      : isError
        ? "error"
        : !medications || medications.length === 0
          ? "empty"
          : "success";

  return (
    <Section
      title="Ongoing medicines"
      description="Current prescriptions and adherence at a glance."
      actions={
        <SummarySectionAction
          href={`/patients/${patientId}?tab=records&subtab=prescriptions`}
          label="Open prescriptions"
        />
      }
    >
      <DataState
        status={status}
        loadingMessage="Loading ongoing medicines…"
        errorMessage="We could not load ongoing medicines. Please try again."
        onRetry={() => refetch()}
        emptyIcon={Pill}
        emptyTitle="No ongoing medicines"
        emptyDescription="Active prescriptions will appear here."
      >
        <div className="divide-y divide-border/60">
          {medications?.map((medication) => {
            const adherenceRate = medication.adherence
              ? clampPercentage(medication.adherence.adherenceRate)
              : null;
            return (
              <article
                key={medication.medicationId}
                className="space-y-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold">{medication.name}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {[
                        medication.dosage,
                        medication.frequency,
                        medication.route,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  {medication.isPRN ? (
                    <Badge variant="outline">As needed</Badge>
                  ) : (
                    <Badge variant="secondary">{medication.duration}</Badge>
                  )}
                </div>
                {medication.prnInstructions ? (
                  <p className="text-xs text-muted-foreground">
                    Take when: {medication.prnInstructions}
                  </p>
                ) : null}
                {!medication.isPRN ? (
                  adherenceRate === null ? (
                    <p className="text-xs text-muted-foreground">
                      Adherence data is not available yet.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-muted-foreground">Adherence</span>
                        <span className="font-semibold tabular-nums">
                          {Math.round(adherenceRate)}%
                        </span>
                      </div>
                      <Progress
                        value={adherenceRate}
                        aria-label={`${medication.name} adherence`}
                      />
                      <p className="text-[length:var(--fs-2xs)] text-muted-foreground">
                        {medication.adherence?.taken ?? 0} of{" "}
                        {medication.adherence?.totalDoses ?? 0} doses taken
                      </p>
                    </div>
                  )
                ) : null}
              </article>
            );
          })}
        </div>
      </DataState>
    </Section>
  );
}
