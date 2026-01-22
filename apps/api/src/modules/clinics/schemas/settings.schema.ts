import { z } from 'zod';
import { ClinicType } from '@workspace/db';

export const ClinicSettingsSchema = z.object({
  description: z.string().optional(),
  openingTime: z.string().optional(),
  closingTime: z.string().optional(),
  workingDays: z.array(z.string()).optional(),
  consultationDuration: z.number().default(30),
  reminderBefore: z.union([z.string(), z.number()]).optional(),
  reminderUnit: z.string().optional(),
  whatsappAppointmentReminders: z.boolean().optional(),
  whatsappFollowUpMessages: z.boolean().optional(),
  whatsappBirthdayWishes: z.boolean().optional(),
  whatsappMedicineReminders: z.boolean().optional(),
  customFields: z
    .array(
      z.object({
        name: z.string(),
        type: z.string(),
        required: z.boolean(),
      }),
    )
    .optional(),
  emailNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  appointmentAlerts: z.boolean().optional(),
  reportAlerts: z.boolean().optional(),
  twoFactorAuth: z.boolean().optional(),
  sessionTimeout: z.union([z.string(), z.number()]).optional(),
  auditLogs: z.boolean().optional(),
  theme: z.string().optional(),
  primaryColor: z.string().optional(),
  compactMode: z.boolean().optional(),

  // Prescription defaults
  defaultInstructions: z.string().optional(),
  defaultFooterText: z.string().optional(),
  includeClinicHeader: z.boolean().optional(),
  includeDoctorSignature: z.boolean().optional(),
  includeQRCode: z.boolean().optional(),
});

export type ClinicSettings = z.infer<typeof ClinicSettingsSchema>;
