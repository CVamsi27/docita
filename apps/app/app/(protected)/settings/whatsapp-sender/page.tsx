export const dynamic = "force-dynamic";

import { AppPageScaffold, PageHeader } from "@workspace/ui/components";
import { WhatsappSenderSettings } from "@/features/settings/components/whatsapp/WhatsappSenderSettings";
import { WhatsappTemplatesSettings } from "@/features/settings/components/whatsapp/WhatsappTemplatesSettings";

export default function WhatsappSenderSettingsPage() {
  return (
    <AppPageScaffold contentClassName="space-y-6">
      <PageHeader
        title="WhatsApp sender"
        description="Configure the clinic identity used for WhatsApp messages."
      />
      <WhatsappSenderSettings />
      <WhatsappTemplatesSettings />
    </AppPageScaffold>
  );
}
