"use client";

import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { JoinRequestsSettingsPanel } from "@/features/settings/components/management/JoinRequestsSettingsPanel";

export default function JoinRequestsPage() {
  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="Team Join Requests"
          description="Review and approve requests from users who want to join your facility."
        />
      }
    >
      <JoinRequestsSettingsPanel />
    </AppPageScaffold>
  );
}
