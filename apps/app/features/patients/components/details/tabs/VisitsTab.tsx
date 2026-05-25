"use client";

import { useState } from "react";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { Clock3 } from "lucide-react";
import type { TimelineEventType } from "@workspace/types";
import { usePatientTimeline } from "@workspace/data-access";
import { PatientTimeline } from "@/components/patient-history";

interface VisitsTabProps {
  patientId: string;
}

const VISIT_TYPES: TimelineEventType[] = ["APPOINTMENT", "FOLLOW_UP", "ADMISSION"];

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
          : prev.filter((t) => t !== type)
        : [...prev, type],
    );
  };

  if (isLoading && !data) {
    return <DataState status="loading" loadingMessage="Loading visits…" />;
  }

  if (isError) {
    return (
      <DataState
        status="error"
        errorMessage="We could not load these visits. Please try again."
        onRetry={() => refetch()}
      />
    );
  }

  if (!data) {
    return (
      <DataState
        status="empty"
        emptyIcon={Clock3}
        emptyTitle="No visits yet"
        emptyDescription="Past and upcoming appointments for this patient will appear here."
      />
    );
  }

  const hasMore = offset + limit < data.total;

  return (
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
  );
}
