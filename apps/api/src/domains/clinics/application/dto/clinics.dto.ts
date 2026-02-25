import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ClinicTier, ClinicType } from '@workspace/db';
import { ClinicSettingsSchema } from '../../presentation/schemas/settings.schema';

export const CreateClinicSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  logo: z.string().optional(),
  tier: z.nativeEnum(ClinicTier).optional(),
  type: z.nativeEnum(ClinicType).optional(),
  settings: ClinicSettingsSchema.optional(),
});

export class CreateClinicDto extends createZodDto(CreateClinicSchema) {}

export class UpdateClinicDto extends createZodDto(
  CreateClinicSchema.partial(),
) {}

// Separate DTO for settings update which overlaps with update but has specific fields
export const ClinicSettingsUpdateSchema = z.object({
  name: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  phoneNumber: z.string().optional(), // Alias or alternative field
  email: z.string().email().optional(),
  website: z.string().url().optional().or(z.literal('')),
  description: z.string().optional(),
  openingTime: z.string().optional(),
  closingTime: z.string().optional(),
  workingDays: z.array(z.string()).optional(),
  consultationDuration: z.number().int().positive().optional(),
  type: z.nativeEnum(ClinicType).optional(),
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
  paymentReminderEnabled: z.boolean().optional(),
  paymentReminderDays: z.array(z.number().int().min(1).max(30)).optional(),
  paymentReminderAutoSendWhatsApp: z.boolean().optional(),
  useSameBankAccountForSubscriptionAndReceipts: z.boolean().optional(),
  subscriptionPaymentBankAccount: z
    .object({
      accountHolderName: z.string().optional(),
      bankName: z.string().optional(),
      accountNumber: z.string().optional(),
      ifscCode: z.string().optional(),
      branchName: z.string().optional(),
      upiId: z.string().optional(),
    })
    .optional(),
  paymentReceivingBankAccount: z
    .object({
      accountHolderName: z.string().optional(),
      bankName: z.string().optional(),
      accountNumber: z.string().optional(),
      ifscCode: z.string().optional(),
      branchName: z.string().optional(),
      upiId: z.string().optional(),
    })
    .optional(),
});

export class ClinicSettingsDto extends createZodDto(
  ClinicSettingsUpdateSchema,
) {}

export const clinicSchema = CreateClinicSchema.extend({
  id: z.string(),
  active: z.boolean().optional(),
  createdAt: z.date().optional(),
});

export class ClinicResponseDto extends createZodDto(clinicSchema) {}

export class ClinicListResponseDto extends createZodDto(
  z.array(clinicSchema),
) {}

// Using UserResponseDto for doctor/receptionist responses might be cleaner, but we can also define lists here
// for now, let's export base Clinic DTOs

export const CreateStaffSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  phoneNumber: z.string().optional(),
});

export const CreateDoctorSchema = CreateStaffSchema.extend({
  specialization: z.string().optional(),
  qualification: z.string().optional(),
  registrationNumber: z.string().optional(),
});

export class ClinicCreateDoctorDto extends createZodDto(CreateDoctorSchema) {}

export class ClinicCreateReceptionistDto extends createZodDto(
  CreateStaffSchema,
) {}
