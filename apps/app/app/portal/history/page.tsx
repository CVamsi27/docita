"use client";

import { PortalHistoryTimelineUI } from "@/features/patient-portal/components/views/portal-history-timeline-ui";
import { AppPageScaffold } from "@workspace/ui/components/app-page-scaffold";

export default function PatientMedicalHistoryPage() {
  return (
    <AppPageScaffold>
      <PortalHistoryTimelineUI />
    </AppPageScaffold>
  );
}
