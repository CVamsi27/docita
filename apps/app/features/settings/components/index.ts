/**
 * Settings Components - Organized by domain
 */

// Clinic Management
export * from "./management/MemberManagementSettings";
export * from "./management/DoctorManagementSettings";
export * from "./management/DoctorAvailabilitySettings";

// Clinic Configuration
export * from "./clinic/ClinicGeneralSettings";
export * from "./clinic/WhatsAppAutomationSettings";
export * from "./clinic/QueueSettings";
export * from "./clinic/CustomFieldsSettings";

// Clinical
export * from "./clinical/PrescriptionDefaultsSettings";
export * from "./clinical/TemplatesSettings";

// Security
export * from "./security/SecuritySettings";
export * from "./security/ChangePasswordSettings";

// Billing
export * from "./billing/SubscriptionSettings";

// UI & Layout
export * from "./ui/AppearanceSettings";
export * from "./ui/SettingsModals";

// Notifications
export * from "./notifications/NotificationSettings";
export * from "./notifications/NotificationFeed";
export * from "./notifications/ReminderSettingsUI";

// Re-export specific aliases if needed by existing code
export { ReminderSettingsUI as ReminderSettings } from "./notifications/ReminderSettingsUI";

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
