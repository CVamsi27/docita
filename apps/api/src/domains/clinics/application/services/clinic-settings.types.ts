import type { WorkspaceProfile } from '@workspace/types';

export interface ClinicSettingsData {
  name?: string;
  address?: string;
  phone?: string;
  phoneNumber?: string;
  gstin?: string;
  email?: string;
  website?: string;
  description?: string;
  openingTime?: string;
  closingTime?: string;
  workingDays?: string[];
  consultationDuration?: number;
  reminderBefore?: string | number;
  reminderUnit?: string;
  whatsappAppointmentReminders?: boolean;
  whatsappFollowUpMessages?: boolean;
  whatsappBirthdayWishes?: boolean;
  whatsappMedicineReminders?: boolean;
  customFields?: { name: string; type: string; required: boolean }[];
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  pushNotifications?: boolean;
  appointmentAlerts?: boolean;
  reportAlerts?: boolean;
  twoFactorAuth?: boolean;
  sessionTimeout?: string | number;
  auditLogs?: boolean;
  theme?: string;
  primaryColor?: string;
  compactMode?: boolean;
  avgConsultationMinutes?: number;
  lateArrivalGraceMinutes?: number;
  queueBufferMinutes?: number;
  useDoctorQueues?: boolean;
  followUpReminderEnabled?: boolean;
  followUpReminderBefore?: string;
  followUpReminderUnit?: string;
  invoiceReminderEnabled?: boolean;
  invoiceReminderBefore?: string;
  invoiceReminderUnit?: string;
  prescriptionReminderEnabled?: boolean;
  prescriptionReminderBefore?: string;
  prescriptionReminderUnit?: string;
  scheduleNotificationEnabled?: boolean;
  scheduleNotificationBefore?: string;
  scheduleNotificationUnit?: string;
  whatsappPreAppointmentEnabled?: boolean;
  whatsappPreAppointmentMinutes?: number;
  paymentReminderEnabled?: boolean;
  paymentReminderDays?: number[];
  paymentReminderAutoSendWhatsApp?: boolean;
  useSameBankAccountForSubscriptionAndReceipts?: boolean;
  subscriptionPaymentBankAccount?: BankAccountSettings;
  paymentReceivingBankAccount?: BankAccountSettings;
  facilityLabel?: 'CLINIC' | 'HOSPITAL';
  taxSettings?: TaxSettingsData;
  workspaceProfile?: WorkspaceProfile;
  sidebarNavOrder?: unknown;
  mapsLink?: string;
  brandName?: string;
  lockedTheme?: LockedThemeSettings;
}

interface BankAccountSettings {
  accountHolderName?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  upiId?: string;
}

interface TaxSettingsData {
  countryCode: string;
  regime?: 'IN_GST' | 'VAT' | 'SALES_TAX' | 'NONE';
  registrationId?: string;
  registrationLabel?: string;
}

interface LockedThemeSettings {
  primaryColor?: string;
  mode?: 'light' | 'dark' | 'system';
  compactMode?: boolean;
  enforced?: boolean;
}
