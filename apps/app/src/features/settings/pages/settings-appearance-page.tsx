import { AppPageScaffold, PageHeader } from "@workspace/ui/components";
import { AppearanceSettings } from "@/features/settings/components/ui/AppearanceSettings";
import { PageMeta } from "@/components/layout/page-meta";

export function SettingsAppearancePage() {
  return (
    <>
      <PageMeta title="Appearance" description="Theme, accent, and density settings" />
      <AppPageScaffold
        header={
          <PageHeader
            title="Appearance"
            description="Theme, accent color, and density for this account."
          />
        }
      >
        <AppearanceSettings />
      </AppPageScaffold>
    </>
  );
}
