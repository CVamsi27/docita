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
import { ClinicGeneralSettingsForm } from "./clinic-general-settings-form";
import { useClinicGeneralSettings } from "./use-clinic-general-settings";

export function ClinicGeneralSettings() {
  const settings = useClinicGeneralSettings();

  if (settings.isLoading) return <ClinicGeneralSettingsSkeleton />;

  return (
    <div className="flex flex-col gap-6">
      <SettingsAiChips scope="clinic-general" />
      <Card>
        <CardHeader className="border-b border-border/60 pb-5">
          <CardTitle>{settings.facilityLabel} profile</CardTitle>
          <CardDescription>
            Shown on receipts, prescriptions, appointment messages, and the
            booking page.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          {settings.clinic?.referralCode ? (
            <div className="mb-6">
              <ClinicReferralLinks
                facilityLabel={settings.facilityLabel}
                referralCode={settings.clinic.referralCode}
              />
            </div>
          ) : null}
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
