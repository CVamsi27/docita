import { AppPageScaffold, PageHeader } from "@workspace/ui/components";
import { QueueSettings } from "@/features/settings/components/clinic/QueueSettings";
import { PageMeta } from "@/components/layout/page-meta";

export function SettingsQueuePage() {
  return (
    <>
      <PageMeta title="Queue" description="Queue configuration and live status" />
      <AppPageScaffold
        header={
          <PageHeader
            title="Queue"
            description="Configure how the patient queue is managed and monitor today's live queue."
          />
        }
      >
        <QueueSettings />
      </AppPageScaffold>
    </>
  );
}
