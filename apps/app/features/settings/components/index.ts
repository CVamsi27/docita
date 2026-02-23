/**
 * Settings Components - UI/Container Pattern
 * All settings components exported from here
 */

// PrescriptionDefaultsSettings (Container pattern)
export {
  PrescriptionDefaultsSettingsUI,
  type PrescriptionDefaultsSettingsUIProps,
} from "./PrescriptionDefaultsSettingsUI";
export { PrescriptionDefaultsSettingsContainer } from "./PrescriptionDefaultsSettingsContainer";
export { PrescriptionDefaultsSettingsContainer as PrescriptionDefaultsSettings } from "./PrescriptionDefaultsSettingsContainer";

// Member Management (API-connected - uses useClinicMembers hook)
export { MemberManagementSettings } from "./MemberManagementSettings";

// Settings Components (from SettingsComponents.tsx)
export {
  WhatsAppAutomationSettings,
  NotificationSettings,
  NotificationFeed,
  DoctorAvailabilitySettings,
  ReminderSettings,
  CustomFieldsSettings,
  ClinicGeneralSettings,
  SecuritySettings,
  ChangePasswordSettings,
  SubscriptionSettings,
  DoctorManagementSettings,
  TemplatesSettings,
  AppearanceSettings,
  DoctorProfileModal,
  PaymentModal,
  QueueSettings,
} from "./SettingsComponents";

// Dynamic Settings Stubs
export {
  SubscriptionSettingsDynamic,
  DoctorAvailabilitySettingsDynamic,
  TemplatesSettingsDynamic,
  DrugInteractionCheckerDynamic,
  FeedbackFormDynamic,
  FeedbackDialogDynamic,
  PatientBadgeDynamic,
  FollowUpSchedulerDynamic,
  ConsultationContentDynamic,
  PrescriptionTemplateManagerDynamic,
  AddAppointmentDialogDynamic,
  PatientFormDialogDynamic,
  BulkImportDialogDynamic,
  FhirExportDialogDynamic,
  AddWalkInDialogDynamic,
  WhatsAppSettingsDialogDynamic,
  WhatsAppBroadcastDialogDynamic,
  AdmissionModalDynamic,
  OnboardingTourDynamic,
} from "./SettingsDynamic";
