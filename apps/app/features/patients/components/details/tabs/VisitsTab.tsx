"use client";

// jscpd:ignore-start
import { useState } from "react";
import {
  DataState,
  type DataStateStatus,
} from "@workspace/ui/components/data-display/data-state";
import { Clock3 } from "lucide-react";
import type { TimelineEventType } from "@workspace/types";
import { usePatientTimeline } from "@workspace/data-access";
import { PatientTimeline } from "@/components/patient-history";

interface VisitsTabProps {
  patientId: string;
}

const VISIT_TYPES: TimelineEventType[] = [
  "APPOINTMENT",
  "FOLLOW_UP",
  "ADMISSION",
];

export function VisitsTab({ patientId }: VisitsTabProps) {
  const [selectedTypes, setSelectedTypes] =
    useState<TimelineEventType[]>(VISIT_TYPES);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const { data, isLoading, isError, refetch } = usePatientTimeline(patientId, {
    eventTypes: selectedTypes,
    limit,
    offset,
  });

  const handleTypeToggle = (type: TimelineEventType) => {
    setOffset(0);
    setSelectedTypes((prev) =>
      prev.includes(type)
        ? prev.length === 1
          ? VISIT_TYPES
// jscpd:ignore-end
          : prev.filter((t) => t !== type)
        : [...prev, type],
    );
  };
  const status: DataStateStatus = isLoading && !data
    ? "loading"
    : isError
      ? "error"
      : !data
        ? "empty"
        : "success";
  const hasMore = !!data && offset + limit < data.total;
  return (
    <DataState
      status={status}
      loadingMessage="Loading visits…"
      errorMessage="We could not load these visits. Please try again."
      onRetry={() => refetch()}
      emptyIcon={Clock3}
      emptyTitle="No visits yet"
      emptyDescription="Past and upcoming appointments for this patient will appear here."
    >
      {data ? (
        <PatientTimeline
          mode="full"
          events={data.events}
          summary={data.summary}
          total={data.total}
          selectedTypes={selectedTypes}
          onTypeToggle={handleTypeToggle}
          onLoadMore={() => setOffset((prev) => prev + limit)}
          hasMore={hasMore}
          isLoading={isLoading}
        />
      ) : null}
    </DataState>
  );
}
