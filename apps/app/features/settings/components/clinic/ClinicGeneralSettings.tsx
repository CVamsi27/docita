"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { SettingsAiChips } from "@/features/settings/components/settings-ai-chips";
import { ClinicGeneralSettingsSkeleton } from "./ClinicGeneralSettingsSkeleton";
import { ClinicReferralLinks } from "./ClinicReferralLinks";
import { WorkspaceModeCard } from "./WorkspaceModeCard";
import { ClinicGeneralSettingsForm } from "./clinic-general-settings-form";
import { useClinicGeneralSettings } from "./use-clinic-general-settings";

export function ClinicGeneralSettings() {
  const settings = useClinicGeneralSettings();

  if (settings.isLoading) return <ClinicGeneralSettingsSkeleton />;

  return (
    <div className="space-y-4">
      <SettingsAiChips scope="clinic-general" />
      <WorkspaceModeCard workspaceProfile={settings.clinic?.workspaceProfile} />
      <Card>
        <CardHeader>
          <CardTitle>{settings.facilityLabel} Information</CardTitle>
          <CardDescription>Basic settings and information</CardDescription>
        </CardHeader>
        <CardContent>
          {!!settings.clinic?.referralCode && (
            <ClinicReferralLinks
              facilityLabel={settings.facilityLabel}
              referralCode={settings.clinic.referralCode}
            />
          )}
          <ClinicGeneralSettingsForm
            form={settings.form}
            facilityLabel={settings.facilityLabel}
            watchedMapsLink={settings.watchedMapsLink}
            isPending={settings.isPending}
            facilityLabelValues={settings.facilityLabelValues}
            onSubmit={settings.handleSubmit}
          />
        </CardContent>
      </Card>
    </div>
  );
}
