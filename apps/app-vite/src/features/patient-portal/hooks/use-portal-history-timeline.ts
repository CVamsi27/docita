"use client";

import { useState } from "react";
import {
  usePortalTimeline,
  usePortalSnapshot,
  usePatientMedicalHistory,
  usePatientPortalDashboard,
} from "@workspace/data-access";
import type { DataStateStatus } from "@workspace/ui/components/data-display/data-state";
import type { TimelineEventType } from "@workspace/types";
import { isRecord } from "@workspace/utils";

const ALL_TIMELINE_EVENT_TYPES: TimelineEventType[] = [
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

const TIMELINE_PAGE_SIZE = 15;

/**
 * Owns the portal history timeline's full data + interaction surface — the
 * event-type filter, pagination offset, and every data fetch the view composes
 * (dashboard, snapshot, timeline, medical history). Extracted from
 * `PortalHistoryTimelineUI` so the view's render wiring isn't carrying this
 * much state-and-fetch bookkeeping alongside its layout.
 */
export function usePortalHistoryTimeline() {
  const [selectedTypes, setSelectedTypes] = useState<TimelineEventType[]>(
    ALL_TIMELINE_EVENT_TYPES,
  );
  const [offset, setOffset] = useState(0);

  const { data: dashboard } = usePatientPortalDashboard();
  const patientRecord =
    dashboard?.patient && isRecord(dashboard.patient)
      ? dashboard.patient
      : undefined;
  const patientId =
    typeof patientRecord?.id === "string" ? patientRecord.id : undefined;

  const { data: snapshot } = usePortalSnapshot();
  const {
    data: timeline,
    isLoading,
    isError,
    refetch,
  } = usePortalTimeline({
    eventTypes: selectedTypes,
    limit: TIMELINE_PAGE_SIZE,
    offset,
  });
  const { data: medicalHistory } = usePatientMedicalHistory(patientId);

  const handleTypeToggle = (type: TimelineEventType) => {
    setOffset(0);
    setSelectedTypes((prev) =>
      prev.includes(type)
        ? prev.length === 1
          ? ALL_TIMELINE_EVENT_TYPES
          : prev.filter((t) => t !== type)
        : [...prev, type],
    );
  };

  const timelineStatus: DataStateStatus =
    isLoading && !timeline
      ? "loading"
      : isError
        ? "error"
        : timeline && timeline.total === 0
          ? "empty"
          : "success";

  return {
    limit: TIMELINE_PAGE_SIZE,
    offset,
    setOffset,
    selectedTypes,
    handleTypeToggle,
    snapshot,
    timeline,
    timelineStatus,
    refetch,
    medicalHistory,
  };
}
