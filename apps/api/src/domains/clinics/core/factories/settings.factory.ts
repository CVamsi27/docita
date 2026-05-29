import { Injectable } from '@nestjs/common';
import {
  ClinicSettings,
  ClinicSettingsSchema,
} from '@/domains/clinics/presentation/schemas/settings.schema';

@Injectable()
export class SettingsFactory {
  createDefault(): ClinicSettings {
    return {
      workingDays: [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ],
      consultationDuration: 30,
      reminderBefore: 30,
      reminderUnit: 'minutes',
      whatsappAppointmentReminders: true,
      whatsappFollowUpMessages: false,
      whatsappBirthdayWishes: false,
      whatsappMedicineReminders: true,
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      appointmentAlerts: true,
      reportAlerts: true,
      twoFactorAuth: false,
      auditLogs: true,
      theme: 'light',
      primaryColor: '#0066cc',
      compactMode: false,

      paymentReminderEnabled: true,
      paymentReminderDays: [1, 3, 7],
      paymentReminderAutoSendWhatsApp: true,
      useSameBankAccountForSubscriptionAndReceipts: true,

      includeClinicHeader: true,
      includeDoctorSignature: true,
      includeQRCode: false,
    };
  }

  validate(settings: unknown): ClinicSettings {
    return ClinicSettingsSchema.parse(settings);
  }

  partialValidate(settings: unknown): Partial<ClinicSettings> {
    return ClinicSettingsSchema.partial().parse(settings);
  }
}
