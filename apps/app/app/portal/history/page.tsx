"use client";

import { PortalHistoryTimelineUI } from "@/features/patient-portal/components/views/portal-history-timeline-ui";
import { AppPageScaffold } from "@workspace/ui/components/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/page-header";

export default function PatientMedicalHistoryPage() {
  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="My Health History"
          description="Review your timeline, records, and longitudinal care context."
        />
      }
    >
      <PortalHistoryTimelineUI showHeader={false} />
    </AppPageScaffold>
  );
}
