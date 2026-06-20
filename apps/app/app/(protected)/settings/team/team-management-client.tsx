"use client";

import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { RoleGuard } from "@/components";
import { MemberManagementSettings } from "@/features/settings/components/management/MemberManagementSettings";

export function TeamManagementClient() {
  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="Team Management"
          description="Manage staff members, roles, and permissions."
        />
      }
    >
      {/* Team management is admin-only: backend member mutations require
          manageStaff (ADMIN/ADMIN_DOCTOR). The /settings/team route is reachable
          by all SETTINGS_ROLES, so guard the UI here to match the settings tab
          and avoid showing non-admins controls that 403. */}
      <RoleGuard requiredPermission="manageStaff">
        <MemberManagementSettings />
      </RoleGuard>
    </AppPageScaffold>
  );
}
