import { AppPageScaffold, PageHeader } from "@workspace/ui/components";
import { ClinicGeneralSettings } from "@/features/settings/components/clinic/ClinicGeneralSettings";
import { PageMeta } from "@/components/layout/page-meta";

export function SettingsClinicPage() {
  return (
    <>
      <PageMeta title="Clinic Profile" description="Manage clinic profile details" />
      <AppPageScaffold
        header={
          <PageHeader
            title="Clinic Profile"
            description="Manage your facility's profile, contact details, and compliance identifiers."
          />
        }
      >
        <ClinicGeneralSettings />
      </AppPageScaffold>
    </>
  );
}
