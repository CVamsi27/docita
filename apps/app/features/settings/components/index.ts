
export * from "./management/MemberManagementSettings";
export * from "./management/DoctorManagementSettings";
export * from "./management/DoctorAvailabilitySettings";

export * from "./clinic/ClinicGeneralSettings";
export * from "./clinic/WhatsAppAutomationSettings";
export * from "./clinic/QueueSettings";
export * from "./clinic/CustomFieldsSettings";

export * from "./clinical/PrescriptionDefaultsSettings";
export * from "./clinical/TemplatesSettings";

export * from "./security/SecuritySettings";
export * from "./security/ChangePasswordSettings";

export * from "./billing/SubscriptionSettings";

export * from "./ui/AppearanceSettings";
export * from "./ui/SettingsModals";

export * from "./leave/LeaveManagementSettings";
export * from "./notifications/NotificationSettings";
export * from "./notifications/NotificationFeed";
export * from "./notifications/ReminderSettingsUI";

export { ReminderSettingsUI as ReminderSettings } from "./notifications/ReminderSettingsUI";

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
