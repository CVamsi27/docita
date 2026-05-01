"use client";

import { AppPageScaffold } from "@workspace/ui/components/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/page-header";
import { ComplianceSettingsPanel } from "@/features/settings/components/compliance/ComplianceSettingsPanel";

export default function ComplianceSettingsPage() {
  return (
    <AppPageScaffold
      className="max-w-3xl"
      header={
        <PageHeader
          title="Compliance"
          description="Legal agreements, data protection, and audit information for your facility."
        />
      }
    >
      <ComplianceSettingsPanel />
    </AppPageScaffold>
  );
}
