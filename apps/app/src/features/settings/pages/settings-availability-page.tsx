import { AppPageScaffold, PageHeader } from "@workspace/ui/components";
import { DoctorAvailabilitySettings } from "@/features/settings/components/management/DoctorAvailabilitySettings";
import { DoctorTimeAwaySettings } from "@/features/settings/components/management/DoctorTimeAwaySettings";
import { PageMeta } from "@/components/layout/page-meta";

export function SettingsAvailabilityPage() {
  return (
    <>
      <PageMeta
        title="Availability"
        description="Doctor schedules and time away"
      />
      <AppPageScaffold
        header={
          <PageHeader
            title="Availability"
            description="Manage doctor weekly schedules and block time away from the calendar."
          />
        }
      >
        <div className="flex flex-col gap-6">
          <DoctorTimeAwaySettings />
          <DoctorAvailabilitySettings />
        </div>
      </AppPageScaffold>
    </>
  );
}
