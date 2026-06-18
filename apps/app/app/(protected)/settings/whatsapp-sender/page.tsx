export const dynamic = "force-dynamic";

import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
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
