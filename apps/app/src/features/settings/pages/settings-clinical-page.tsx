import { AppPageScaffold, PageHeader } from "@workspace/ui/components";
import { OpdSlipSettingsContainer } from "@/features/settings/components/clinical/OpdSlipSettings";
import { PrescriptionDefaultsSettingsContainer } from "@/features/settings/components/clinical/PrescriptionDefaultsSettings";
import { PageMeta } from "@/components/layout/page-meta";

export function SettingsClinicalPage() {
  return (
    <>
      <PageMeta title="Clinical Defaults" description="OPD slip and prescription defaults" />
      <AppPageScaffold
        header={
          <PageHeader
            title="Clinical Defaults"
            description="Pre-filled values for OPD slips and new prescriptions."
          />
        }
      >
        <div className="flex flex-col gap-6">
          <OpdSlipSettingsContainer />
          <PrescriptionDefaultsSettingsContainer />
        </div>
      </AppPageScaffold>
    </>
  );
}
