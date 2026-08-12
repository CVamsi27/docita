import { lazy } from "react";

export const SettingsPage = lazy(() =>
  import("@/features/settings/pages/settings-page").then((m) => ({ default: m.SettingsPage })),
);
export const SettingsTeamPage = lazy(() =>
  import("@/features/settings/pages/settings-team-page").then((m) => ({ default: m.SettingsTeamPage })),
);
export const SettingsTeamJoinRequestsPage = lazy(() =>
  import("@/features/settings/pages/settings-team-page").then((m) => ({ default: m.SettingsTeamJoinRequestsPage })),
);
export const SettingsClinicPage = lazy(() =>
  import("@/features/settings/pages/settings-clinic-page").then((m) => ({ default: m.SettingsClinicPage })),
);
export const SettingsCompliancePage = lazy(() =>
  import("@/features/settings/pages/settings-compliance-page").then((m) => ({ default: m.SettingsCompliancePage })),
);
export const SettingsWhatsappSenderPage = lazy(() =>
  import("@/features/settings/pages/settings-whatsapp-sender-page").then((m) => ({ default: m.SettingsWhatsappSenderPage })),
);
export const SettingsComplianceConsentTemplatePage = lazy(() =>
  import("@/features/settings/pages/settings-consent-template-page").then((m) => ({ default: m.SettingsComplianceConsentTemplatePage })),
);
export const SettingsTemplatesPage = lazy(() =>
  import("@/features/settings/pages/settings-templates-page").then((m) => ({ default: m.SettingsTemplatesPage })),
);
export const SettingsAppearancePage = lazy(() =>
  import("@/features/settings/pages/settings-appearance-page").then((m) => ({ default: m.SettingsAppearancePage })),
);
export const SettingsQueuePage = lazy(() =>
  import("@/features/settings/pages/settings-queue-page").then((m) => ({ default: m.SettingsQueuePage })),
);
export const SettingsClinicalPage = lazy(() =>
  import("@/features/settings/pages/settings-clinical-page").then((m) => ({ default: m.SettingsClinicalPage })),
);
export const SettingsSecurityPage = lazy(() =>
  import("@/features/settings/pages/settings-security-page").then((m) => ({ default: m.SettingsSecurityPage })),
);
export const SettingsNotificationsPage = lazy(() =>
  import("@/features/settings/pages/settings-notifications-page").then((m) => ({ default: m.SettingsNotificationsPage })),
);
export const SettingsDangerZonePage = lazy(() =>
  import("@/features/settings/pages/settings-danger-zone-page").then((m) => ({ default: m.SettingsDangerZonePage })),
);
export const SettingsDoctorProfilePage = lazy(() =>
  import("@/features/settings/pages/settings-doctor-profile-page").then((m) => ({ default: m.SettingsDoctorProfilePage })),
);
export const SettingsAvailabilityPage = lazy(() =>
  import("@/features/settings/pages/settings-availability-page").then((m) => ({ default: m.SettingsAvailabilityPage })),
);
export const SettingsLeavePage = lazy(() =>
  import("@/features/settings/pages/settings-leave-page").then((m) => ({ default: m.SettingsLeavePage })),
);
export const SettingsAccountPage = lazy(() =>
  import("@/features/settings/pages/settings-account-page").then((m) => ({ default: m.SettingsAccountPage })),
);
