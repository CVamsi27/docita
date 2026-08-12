import { AppPageScaffold, PageHeader } from "@workspace/ui/components";
import { ComplianceSettingsPanel } from "../components/compliance/ComplianceSettingsPanel";
import { PageMeta } from "@/components/layout/page-meta";

export function SettingsCompliancePage() {
  return (
    <>
      <PageMeta title="Compliance" description="Compliance and consent settings" />
      <AppPageScaffold
        header={
          <PageHeader
            title="Compliance"
            description="Legal agreements, data protection, and audit information for your facility."
          />
        }
      >
        <ComplianceSettingsPanel />
      </AppPageScaffold>
    </>
  );
}
