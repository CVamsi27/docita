import { AppPageScaffold, PageHeader } from "@workspace/ui/components";
import { DoctorProfileSettings } from "@/features/settings/components/doctor-profile/DoctorProfileSettings";
import { SettingsProfileHeader } from "@/features/settings/components/profile/SettingsProfileHeader";
import { PageMeta } from "@/components/layout/page-meta";

export function SettingsDoctorProfilePage() {
  return (
    <>
      <PageMeta
        title="Doctor Profile"
        description="Digital signature, medical registration, and HPR ID"
      />
      <AppPageScaffold
        header={
          <PageHeader
            title="Doctor Profile"
            description="Digital signature, medical registration, and HPR ID."
          />
        }
      >
        <div className="flex flex-col gap-6">
          <SettingsProfileHeader />
          <DoctorProfileSettings />
        </div>
      </AppPageScaffold>
    </>
  );
}
