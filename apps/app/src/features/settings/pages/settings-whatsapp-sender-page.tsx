import { AppPageScaffold, PageHeader } from "@workspace/ui/components";
import { WhatsappSenderSettings } from "../components/whatsapp/WhatsappSenderSettings";
import { PageMeta } from "@/components/layout/page-meta";

export function SettingsWhatsappSenderPage() {
  return (
    <>
      <PageMeta title="WhatsApp Sender" description="Configure WhatsApp sender" />
      <AppPageScaffold
        header={
          <PageHeader
            title="WhatsApp Sender"
            description="Configure WhatsApp sender name and templates."
          />
        }
      >
        <WhatsappSenderSettings />
      </AppPageScaffold>
    </>
  );
}
