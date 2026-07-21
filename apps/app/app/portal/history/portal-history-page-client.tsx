"use client";

import { PortalHistoryTimelineUI } from "@/features/patient-portal/components/views/portal-history-timeline-ui";
import {
  AppPageScaffold,
  PageHeader
} from "@workspace/ui/components";

export function PortalHistoryPageClient() {
  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="My Health History"
          description="Review your timeline, records, and longitudinal care context"
        />
      }
    >
      <PortalHistoryTimelineUI showHeader={false} />
    </AppPageScaffold>
  );
}
