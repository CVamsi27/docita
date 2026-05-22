"use client";

import type { TimelineEventType, PatientTimelineResponse } from "@workspace/types";
import { PatientTimeline } from "@/components/patient-history";

interface UnifiedTimelineUIProps {
  data: PatientTimelineResponse;
  selectedTypes: TimelineEventType[];
  onTypeToggle: (type: TimelineEventType) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
}

export function UnifiedTimelineUI({
  data,
  selectedTypes,
  onTypeToggle,
  onLoadMore,
  hasMore,
  isLoading,
}: UnifiedTimelineUIProps) {
  return (
    <PatientTimeline
      mode="full"
      events={data.events}
      summary={data.summary}
      total={data.total}
      selectedTypes={selectedTypes}
      onTypeToggle={onTypeToggle}
      onLoadMore={onLoadMore}
      hasMore={hasMore}
      isLoading={isLoading}
    />
  );
}
