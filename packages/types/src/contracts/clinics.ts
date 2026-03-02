import { z } from "zod";
import { jsonObjectSchema } from "../shared/json-schema";

const customFieldSchema = z.object({
  name: z.string(),
  type: z.string(),
  required: z.boolean(),
});

const bankAccountSchema = z.object({
  accountHolderName: z.string().optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  branchName: z.string().optional(),
  upiId: z.string().optional(),
});

export const createClinicRequestSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  logo: z.string().optional(),
  tier: z.string().optional(),
  type: z.string().optional(),
  settings: jsonObjectSchema.optional(),
});

export const updateClinicRequestSchema = createClinicRequestSchema.partial();

export const listClinicsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const updateClinicSettingsRequestSchema = z.object({
  name: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  phoneNumber: z.string().optional(),
  email: z.string().email().optional(),
  website: z.union([z.string().url(), z.literal("")]).optional(),
  description: z.string().optional(),
  openingTime: z.string().optional(),
  closingTime: z.string().optional(),
  workingDays: z.array(z.string()).optional(),
  consultationDuration: z.number().int().positive().optional(),
  type: z.string().optional(),
  reminderBefore: z.union([z.string(), z.number()]).optional(),
  reminderUnit: z.string().optional(),
  whatsappAppointmentReminders: z.boolean().optional(),
  whatsappFollowUpMessages: z.boolean().optional(),
  whatsappBirthdayWishes: z.boolean().optional(),
  whatsappMedicineReminders: z.boolean().optional(),
  customFields: z.array(customFieldSchema).optional(),
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
  subscriptionPaymentBankAccount: bankAccountSchema.optional(),
  paymentReceivingBankAccount: bankAccountSchema.optional(),
});

export const createClinicDoctorRequestSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  phoneNumber: z.string().optional(),
  specialization: z.string().optional(),
  qualification: z.string().optional(),
  registrationNumber: z.string().optional(),
});

export const createClinicReceptionistRequestSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  phoneNumber: z.string().optional(),
});

export const updateClinicMemberRequestSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string().optional(),
  role: z.enum(["DOCTOR", "RECEPTIONIST", "ADMIN_DOCTOR"]).optional(),
  specialization: z.string().optional(),
  qualification: z.string().optional(),
  registrationNumber: z.string().optional(),
});

export const clinicResponseSchema = createClinicRequestSchema.extend({
  id: z.string(),
  active: z.boolean().optional(),
  createdAt: z.union([z.string(), z.date()]).optional(),
});

export const listClinicsResponseSchema = z.array(clinicResponseSchema);

export type CreateClinicRequest = z.infer<typeof createClinicRequestSchema>;
export type UpdateClinicRequest = z.infer<typeof updateClinicRequestSchema>;
export type ListClinicsContractQuery = z.infer<typeof listClinicsQuerySchema>;
export type UpdateClinicSettingsRequest = z.infer<
  typeof updateClinicSettingsRequestSchema
>;
export type CreateClinicDoctorRequest = z.infer<
  typeof createClinicDoctorRequestSchema
>;
export type CreateClinicReceptionistRequest = z.infer<
  typeof createClinicReceptionistRequestSchema
>;
export type UpdateClinicMemberRequest = z.infer<
  typeof updateClinicMemberRequestSchema
>;
