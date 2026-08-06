import { AppPageScaffold, PageHeader } from "@workspace/ui/components";
import { DangerZoneSettings } from "@/features/settings/components/danger-zone/DangerZoneSettings";
import { PageMeta } from "@/components/layout/page-meta";

export function SettingsDangerZonePage() {
  return (
    <>
      <PageMeta title="Danger Zone" description="Account and session actions" />
      <AppPageScaffold
        header={
          <PageHeader
            title="Danger Zone"
            description="Sign out of this workspace or request deletion of your account."
          />
        }
      >
        <DangerZoneSettings />
      </AppPageScaffold>
    </>
  );
}
