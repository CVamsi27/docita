"use client";

import { usePatientSnapshot } from "@workspace/data-access";
import {
  DataState,
  type DataStateStatus,
} from "@workspace/ui/components/data-display/data-state";
import { StatTile } from "@workspace/ui/components/data-display/stat-tile";
import { Section } from "@workspace/ui/components/layout/section";
import { formatDate } from "@workspace/utils";
import { Activity, HeartPulse, Thermometer, Weight } from "lucide-react";
import { SummarySectionAction } from "./SummarySectionAction";

interface LatestVitalsSectionProps {
  patientId: string;
}

export function LatestVitalsSection({ patientId }: LatestVitalsSectionProps) {
  const {
    data: snapshot,
    isLoading,
    isError,
    refetch,
  } = usePatientSnapshot(patientId);
  const vitals = snapshot?.latestVitals;

  const status: DataStateStatus =
    isLoading && !snapshot
      ? "loading"
      : isError
        ? "error"
        : !vitals
          ? "empty"
          : "success";

  return (
    <Section
      title="Latest vitals"
      description={
        vitals?.recordedAt
          ? `Recorded ${formatDate(vitals.recordedAt, "d MMM yyyy")}`
          : "Most recently recorded measurements."
      }
      actions={
        <SummarySectionAction
          href={`/patients/${patientId}?tab=records&subtab=vitals`}
          label="Open vitals"
        />
      }
    >
      {isLoading && !snapshot ? null : (
        <DataState
          status={status}
          loadingMessage="Loading latest vitals…"
          errorMessage="We could not load the latest vitals. Please try again."
          onRetry={() => refetch()}
          emptyIcon={HeartPulse}
          emptyTitle="No vitals recorded"
          emptyDescription="Vitals captured during a visit will appear here."
        >
          {vitals ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <StatTile
                label="Blood pressure"
                value={
                  vitals.systolicBP && vitals.diastolicBP
                    ? `${vitals.systolicBP}/${vitals.diastolicBP}`
                    : "--"
                }
                description="mmHg"
                icon={<Activity className="h-4 w-4" />}
                accent="info"
              />
              <StatTile
                label="Pulse"
                value={vitals.pulse ?? "--"}
                description="bpm"
                icon={<HeartPulse className="h-4 w-4" />}
                accent="success"
              />
              <StatTile
                label="SpO2"
                value={vitals.spo2 ? `${vitals.spo2}%` : "--"}
                icon={<Activity className="h-4 w-4" />}
                accent="info"
              />
              <StatTile
                label="Temperature"
                value={vitals.temperature ? `${vitals.temperature}°` : "--"}
                description="Celsius"
                icon={<Thermometer className="h-4 w-4" />}
                accent="warning"
              />
              <StatTile
                label="Weight"
                value={vitals.weight ?? "--"}
                description="kg"
                icon={<Weight className="h-4 w-4" />}
              />
            </div>
          ) : null}
        </DataState>
      )}
    </Section>
  );
}
