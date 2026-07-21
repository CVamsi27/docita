"use client";

import {
  AppPageScaffold,
  PageHeader
} from "@workspace/ui/components";
import { JoinRequestsSettingsPanel } from "@/features/settings/components/management/JoinRequestsSettingsPanel";

export function JoinRequestsSettingsPageContent() {
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
