"use client";

import { RoleGuard } from "@/components";
import {
  AppearanceSettings,
  ClinicGeneralSettings,
  NotificationSettings,
  OpdSlipSettingsContainer,
  PrescriptionDefaultsSettingsContainer,
  QueueSettings,
  ReminderSettings,
  SecuritySettings,
} from "@/features/settings/components";
import { HelpSupportSettingsPanel } from "./help-support/HelpSupportSettingsPanel";
import { LabDirectorySettings, LabTestsCatalogSettings } from "@/features/lab-tests";
import {
  DangerZoneSettingsLazy,
  DoctorAvailabilitySettingsLazy,
  DoctorProfileSettingsLazy,
  DoctorTimeAwaySettingsLazy,
  EnterpriseBrandingSettingsLazy,
  AbdmSettingsPanelLazy,
  LeaveManagementSettingsLazy,
  MemberManagementSettingsLazy,
  SubscriptionSettingsPanel,
  WhatsappSenderSettingsLazy,
  WhatsappTemplatesSettingsLazy,
} from "./settings-page-lazy-panels";
import { TabsContent } from "@workspace/ui/components/navigation/tabs";

export function SettingsPageTabPanels({
  visibleTabValues,
}: {
  visibleTabValues: Set<string>;
}) {
  return (
    <div className="min-w-0 flex-1 self-stretch">
      {visibleTabValues.has("general") && (
        <TabsContent value="general" className="mt-0 space-y-6">
          <RoleGuard requiredPermission="manageClinic">
            <ClinicGeneralSettings />
          </RoleGuard>
        </TabsContent>
      )}

      {visibleTabValues.has("members") && (
        <TabsContent value="members" className="mt-0 space-y-6">
          <RoleGuard requiredPermission="manageStaff">
            <MemberManagementSettingsLazy />
          </RoleGuard>
        </TabsContent>
      )}

      {visibleTabValues.has("subscription") && (
        <TabsContent value="subscription" className="mt-0 space-y-6">
          <RoleGuard requiredPermission="manageBilling">
            <SubscriptionSettingsPanel />
          </RoleGuard>
        </TabsContent>
      )}

      {visibleTabValues.has("availability") && (
        <TabsContent value="availability" className="mt-0 space-y-6">
          <RoleGuard requiredRole="DOCTOR">
            <div className="space-y-6">
              <DoctorTimeAwaySettingsLazy />
              <DoctorAvailabilitySettingsLazy />
            </div>
          </RoleGuard>
        </TabsContent>
      )}

      {visibleTabValues.has("queue") && (
        <TabsContent value="queue" className="mt-0 space-y-6">
          <RoleGuard requiredPermission="manageClinic">
            <QueueSettings />
          </RoleGuard>
        </TabsContent>
      )}

      {visibleTabValues.has("prescriptions") && (
        <TabsContent value="prescriptions" className="mt-0 space-y-6">
          <RoleGuard requiredPermission="createPrescription">
            <PrescriptionDefaultsSettingsContainer />
          </RoleGuard>
        </TabsContent>
      )}

      {visibleTabValues.has("opd-slip") && (
        <TabsContent value="opd-slip" className="mt-0 space-y-6">
          <RoleGuard requiredPermission="manageClinic">
            <OpdSlipSettingsContainer />
          </RoleGuard>
        </TabsContent>
      )}

      {visibleTabValues.has("labs") && (
        <TabsContent value="labs" className="mt-0 space-y-6">
          <RoleGuard requiredPermission="manageClinic">
            <LabDirectorySettings />
            <LabTestsCatalogSettings />
          </RoleGuard>
        </TabsContent>
      )}

      {visibleTabValues.has("abdm") && (
        <TabsContent value="abdm" className="mt-0 space-y-6">
          <RoleGuard requiredPermission="manageClinic">
            <AbdmSettingsPanelLazy />
          </RoleGuard>
        </TabsContent>
      )}

      {visibleTabValues.has("reminders") && (
        <TabsContent value="reminders" className="mt-0">
          <RoleGuard requiredPermission="manageClinic">
            <ReminderSettings />
          </RoleGuard>
        </TabsContent>
      )}

      {visibleTabValues.has("whatsapp-sender") && (
        <TabsContent value="whatsapp-sender" className="mt-0 space-y-6">
          <RoleGuard requiredPermission="manageClinic">
            <WhatsappSenderSettingsLazy />
            <WhatsappTemplatesSettingsLazy />
          </RoleGuard>
        </TabsContent>
      )}

      {visibleTabValues.has("notifications") && (
        <TabsContent value="notifications" className="mt-0">
          <RoleGuard requiredPermission="manageClinic">
            <NotificationSettings />
          </RoleGuard>
        </TabsContent>
      )}

      {visibleTabValues.has("security") && (
        <TabsContent value="security" className="mt-0">
          <RoleGuard requiredPermission="manageClinic">
            <SecuritySettings />
          </RoleGuard>
        </TabsContent>
      )}

      {visibleTabValues.has("appearance") && (
        <TabsContent value="appearance" className="mt-0">
          <AppearanceSettings />
        </TabsContent>
      )}

      {visibleTabValues.has("help-support") && (
        <TabsContent value="help-support" className="mt-0 space-y-6">
          <HelpSupportSettingsPanel />
        </TabsContent>
      )}

      {visibleTabValues.has("leave") && (
        <TabsContent value="leave" className="mt-0 space-y-6">
          <RoleGuard requiredRole="DOCTOR">
            <LeaveManagementSettingsLazy />
          </RoleGuard>
        </TabsContent>
      )}

      {visibleTabValues.has("doctor-profile") && (
        <TabsContent value="doctor-profile" className="mt-0 space-y-6">
          <RoleGuard requiredRole="DOCTOR">
            <DoctorProfileSettingsLazy />
          </RoleGuard>
        </TabsContent>
      )}

      {visibleTabValues.has("branding") && (
        <TabsContent value="branding" className="mt-0 space-y-6">
          <RoleGuard requiredPermission="manageClinic">
            <EnterpriseBrandingSettingsLazy />
          </RoleGuard>
        </TabsContent>
      )}

      {visibleTabValues.has("danger-zone") && (
        <TabsContent value="danger-zone" className="mt-0 space-y-6">
          <DangerZoneSettingsLazy />
        </TabsContent>
      )}
    </div>
  );
}
