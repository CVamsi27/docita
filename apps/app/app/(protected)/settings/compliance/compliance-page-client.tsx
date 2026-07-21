"use client";

import { AppPageScaffold, PageHeader } from "@workspace/ui/components";
import { ComplianceSettingsPanel } from "@/features/settings/components/compliance/ComplianceSettingsPanel";

export function ComplianceSettingsPageClient() {
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
