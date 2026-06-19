"use client";

import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
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
      <MemberManagementSettings />
    </AppPageScaffold>
  );
}
