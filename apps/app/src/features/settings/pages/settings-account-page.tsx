import { AppPageScaffold, PageHeader } from "@workspace/ui/components";
import { ProfileAccountSettings } from "@/features/settings/components/account/ProfileAccountSettings";
import { SettingsPageHeaderUserMeta } from "@/features/settings/components/profile/SettingsProfileHeader";
import { PageMeta } from "@/components/layout/page-meta";

export function SettingsAccountPage() {
  return (
    <>
      <PageMeta
        title="Account"
        description="Profile, name, email, and password"
      />
      <AppPageScaffold
        header={
          <PageHeader
            title="Account"
            description="Your profile, email, and password."
            actions={<SettingsPageHeaderUserMeta />}
          />
        }
      >
        <ProfileAccountSettings />
      </AppPageScaffold>
    </>
  );
}
