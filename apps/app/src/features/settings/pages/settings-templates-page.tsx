import { AppPageScaffold, PageHeader } from "@workspace/ui/components";
import { WhatsappTemplatesSettings } from "../components/whatsapp/WhatsappTemplatesSettings";
import { PageMeta } from "@/components/layout/page-meta";

export function SettingsTemplatesPage() {
  return (
    <>
      <PageMeta title="WhatsApp Templates" description="Manage WhatsApp message templates" />
      <AppPageScaffold
        header={
          <PageHeader
            title="WhatsApp Templates"
            description="Manage reusable WhatsApp message templates for patient communication."
          />
        }
      >
        <WhatsappTemplatesSettings />
      </AppPageScaffold>
    </>
  );
}
