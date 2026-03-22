"use client";

import { useState } from "react";
import { usePatientTimeline } from "@/hooks/api/use-patient-timeline";
import { UnifiedTimelineUI } from "./UnifiedTimelineUI";
import { ErrorState } from "@workspace/ui/components/error-state";
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
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        message="Failed to load timeline."
        onRetry={() => refetch()}
      />
    );
  }

  if (!data) return null;

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
