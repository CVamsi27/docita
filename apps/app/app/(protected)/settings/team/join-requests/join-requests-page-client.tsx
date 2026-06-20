"use client";

import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { RoleGuard } from "@/components";
import { JoinRequestsSettingsPanel } from "@/features/settings/components/management/JoinRequestsSettingsPanel";

export function JoinRequestsPageClient() {
  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="Team Join Requests"
          description="Review and approve requests from users who want to join your facility."
        />
      }
    >
      {/* Join-request approval is admin-only on the backend (list/approve/reject
          are @Roles(ADMIN, ADMIN_DOCTOR)). The route is reachable by all
          SETTINGS_ROLES, so guard the UI with manageStaff for parity. */}
      <RoleGuard requiredPermission="manageStaff">
        <JoinRequestsSettingsPanel />
      </RoleGuard>
    </AppPageScaffold>
  );
}
