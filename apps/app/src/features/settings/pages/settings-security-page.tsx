import { AppPageScaffold, PageHeader } from "@workspace/ui/components";
import { SecuritySettings } from "@/features/settings/components/security/SecuritySettings";
import { ChangePasswordSettings } from "@/features/settings/components/security/ChangePasswordSettings";
import { PageMeta } from "@/components/layout/page-meta";

export function SettingsSecurityPage() {
  return (
    <>
      <PageMeta title="Security" description="Security and password settings" />
      <AppPageScaffold
        header={
          <PageHeader
            title="Security"
            description="Two-factor authentication, session timeouts, audit logging, and your password."
          />
        }
      >
        <div className="flex flex-col gap-6">
          <SecuritySettings />
          <ChangePasswordSettings />
        </div>
      </AppPageScaffold>
    </>
  );
}
