"use client";

import { useState } from "react";
import { usePatientTimeline } from "@/hooks/api/use-patient-timeline";
import { UnifiedTimelineUI } from "./UnifiedTimelineUI";
import { DataState } from "@workspace/ui/components/data-state";
import { Clock3 } from "lucide-react";
import type { TimelineEventType } from "@workspace/types";

interface UnifiedTimelineContainerProps {
  patientId: string;
}

const ALL_TYPES: TimelineEventType[] = [
  "APPOINTMENT",
  "PRESCRIPTION",
  "METRIC_RECORD",
  "LAB_TEST",
  "MEDICAL_DOCUMENT",
  "FOLLOW_UP",
  "IMMUNIZATION",
  "ADMISSION",
  "MEDICATION_DOSE",
];

export function UnifiedTimelineContainer({
  patientId,
}: UnifiedTimelineContainerProps) {
  const [selectedTypes, setSelectedTypes] =
    useState<TimelineEventType[]>(ALL_TYPES);
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
          ? ALL_TYPES
          : prev.filter((t) => t !== type)
        : [...prev, type],
    );
  };

  if (isLoading && !data) {
    return <DataState status="loading" loadingMessage="Loading timeline..." />;
  }

  if (isError) {
    return (
      <DataState
        status="error"
        errorMessage="Failed to load timeline."
        onRetry={() => refetch()}
      />
    );
  }

  if (!data) {
    return (
      <DataState
        status="empty"
        emptyIcon={Clock3}
        emptyTitle="No timeline records available"
        emptyDescription="Patient events will appear here as care activities are recorded."
      />
    );
  }

  const hasMore = offset + limit < data.total;

  return (
    <UnifiedTimelineUI
      data={data}
      selectedTypes={selectedTypes}
      onTypeToggle={handleTypeToggle}
      onLoadMore={() => setOffset((prev) => prev + limit)}
      hasMore={hasMore}
      isLoading={isLoading}
    />
  );
}
