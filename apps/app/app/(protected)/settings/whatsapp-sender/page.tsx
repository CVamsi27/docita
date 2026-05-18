import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { WhatsappSenderSettings } from "@/features/settings/components/whatsapp/WhatsappSenderSettings";

export default function WhatsappSenderSettingsPage() {
  return (
    <AppPageScaffold>
      <PageHeader
        title="WhatsApp sender"
        description="Configure the clinic identity used for WhatsApp messages."
      />
      <WhatsappSenderSettings />
    </AppPageScaffold>
  );
}
