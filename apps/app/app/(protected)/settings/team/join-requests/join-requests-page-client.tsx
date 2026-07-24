"use client";

import { AppPageScaffold, PageHeader } from "@workspace/ui/components";
import { RoleGuard } from "@/components/auth/role-guard";
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
