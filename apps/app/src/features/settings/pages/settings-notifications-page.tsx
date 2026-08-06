import { AppPageScaffold, PageHeader } from "@workspace/ui/components";
import { NotificationSettings } from "@/features/settings/components/notifications/NotificationSettings";
import { ReminderSettingsUI } from "@/features/settings/components/notifications/ReminderSettingsUI";
import { PageMeta } from "@/components/layout/page-meta";

export function SettingsNotificationsPage() {
  return (
    <>
      <PageMeta title="Notifications" description="Notification and reminder preferences" />
      <AppPageScaffold
        header={
          <PageHeader
            title="Notifications"
            description="Choose how the workspace nudges you and when reminders go out to patients."
          />
        }
      >
        <div className="flex flex-col gap-6">
          <NotificationSettings />
          <ReminderSettingsUI />
        </div>
      </AppPageScaffold>
    </>
  );
}
