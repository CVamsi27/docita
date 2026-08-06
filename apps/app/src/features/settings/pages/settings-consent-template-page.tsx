import { PageMeta } from "@/components/layout/page-meta";
import { ConsentTemplatePageContent } from "../components/compliance/consent-template-page-content";

export function SettingsComplianceConsentTemplatePage() {
  return (
    <>
      <PageMeta title="Consent Template" description="Printable patient consent form" />
      <ConsentTemplatePageContent />
    </>
  );
}
