"use client";

import { PatientSnapshotStrip } from "@/components/patient-history/PatientSnapshotStrip";
import { usePortalHistoryTimeline } from "@/features/patient-portal/hooks/use-portal-history-timeline";
import { PortalMedicalHistoryPanel, PortalTimelineSection } from "./portal-history-timeline-ui-sections";

interface PortalHistoryTimelineUIProps {
  showHeader?: boolean;
}

export function PortalHistoryTimelineUI({
  showHeader = true,
}: PortalHistoryTimelineUIProps) {
  const {
    limit,
    offset,
    setOffset,
    selectedTypes,
    handleTypeToggle,
    snapshot,
    timeline,
    timelineStatus,
    refetch,
    medicalHistory,
  } = usePortalHistoryTimeline();

  return (
    <div className="space-y-6">
      {showHeader ? (
        <div>
          <h1 className="ui-page-title">My Health History</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A complete record of your health journey in one place.
          </p>
        </div>
      ) : null}

      {snapshot && (
        <PatientSnapshotStrip snapshot={snapshot} layout="horizontal" />
      )}

      <PortalTimelineSection
        status={timelineStatus}
        timeline={timeline}
        selectedTypes={selectedTypes}
        onTypeToggle={handleTypeToggle}
        offset={offset}
        limit={limit}
        onLoadMore={() => setOffset((prev) => prev + limit)}
        onRetry={() => void refetch()}
      />

      {medicalHistory && (
        <PortalMedicalHistoryPanel medicalHistory={medicalHistory} />
      )}
    </div>
  );
}
