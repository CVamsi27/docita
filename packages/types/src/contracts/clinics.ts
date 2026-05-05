import { z } from "zod";
import { jsonObjectSchema } from "../shared/json-schema";
import { workspaceProfileSchema } from "../shared/workspace-profile";
import { sidebarNavOrderSchema } from "../shared/sidebar-nav";

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

const taxSettingsSchema = z.object({
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/),
  regime: z.enum(["IN_GST", "VAT", "SALES_TAX", "NONE"]).optional(),
  registrationId: z.string().optional(),
  registrationLabel: z.string().optional(),
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
  gstin: z.union([z.string(), z.literal("")]).optional(),
  email: z.string().email().optional(),
  website: z.union([z.string().url(), z.literal("")]).optional(),
  description: z.string().optional(),
  openingTime: z.string().optional(),
  closingTime: z.string().optional(),
  workingDays: z.array(z.string()).optional(),
  consultationDuration: z.number().int().positive().optional(),
  avgConsultationMinutes: z.number().int().min(1).max(120).optional(),
  lateArrivalGraceMinutes: z.number().int().min(0).max(120).optional(),
  queueBufferMinutes: z.number().int().min(0).max(120).optional(),
  useDoctorQueues: z.boolean().optional(),
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
  followUpReminderEnabled: z.boolean().optional(),
  followUpReminderBefore: z.string().optional(),
  followUpReminderUnit: z.string().optional(),
  invoiceReminderEnabled: z.boolean().optional(),
  invoiceReminderBefore: z.string().optional(),
  invoiceReminderUnit: z.string().optional(),
  prescriptionReminderEnabled: z.boolean().optional(),
  prescriptionReminderBefore: z.string().optional(),
  prescriptionReminderUnit: z.string().optional(),
  scheduleNotificationEnabled: z.boolean().optional(),
  scheduleNotificationBefore: z.string().optional(),
  scheduleNotificationUnit: z.string().optional(),
  whatsappPreAppointmentEnabled: z.boolean().optional(),
  whatsappPreAppointmentMinutes: z.number().int().min(1).max(120).optional(),
  useSameBankAccountForSubscriptionAndReceipts: z.boolean().optional(),
  subscriptionPaymentBankAccount: bankAccountSchema.optional(),
  paymentReceivingBankAccount: bankAccountSchema.optional(),
  taxSettings: taxSettingsSchema.optional(),
  facilityLabel: z.enum(["CLINIC", "HOSPITAL"]).optional(),
  workspaceProfile: workspaceProfileSchema.optional(),
  sidebarNavOrder: sidebarNavOrderSchema.optional(),
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
  role: z.enum(["RECEPTIONIST", "NURSE"]).optional(),
});

const clinicMemberInviteRoleSchema = z.enum([
  "DOCTOR",
  "NURSE",
  "RECEPTIONIST",
  "ADMIN",
  "ADMIN_DOCTOR",
]);

export const createClinicMemberRequestSchema = z
  .object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8),
    phoneNumber: z.string().optional(),
    role: clinicMemberInviteRoleSchema,
    specialization: z.string().optional(),
    qualification: z.string().optional(),
    registrationNumber: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      (data.role === "DOCTOR" || data.role === "ADMIN_DOCTOR") &&
      !data.registrationNumber?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["registrationNumber"],
        message: "Enter the medical registration number",
      });
    }
  });

export const updateClinicMemberRequestSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string().optional(),
  role: z
    .enum(["DOCTOR", "NURSE", "RECEPTIONIST", "ADMIN", "ADMIN_DOCTOR"])
    .optional(),
  specialization: z.string().optional(),
  qualification: z.string().optional(),
  registrationNumber: z.string().optional(),
});

export const clinicResponseSchema = createClinicRequestSchema.extend({
  id: z.string(),
  active: z.boolean().optional(),
  createdAt: z.union([z.string(), z.date()]).optional(),
  referralCode: z.string().optional(),
  gstin: z.union([z.string(), z.null()]).optional(),
  slaSignatureUrl: z.union([z.string(), z.null()]).optional(),
  slaSignatureStoredUrl: z.union([z.string(), z.null()]).optional(),
  slaSignatureAcceptedAt: z.union([z.string(), z.date(), z.null()]).optional(),
  workspaceProfile: workspaceProfileSchema.optional(),
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
export type CreateClinicMemberRequest = z.infer<
  typeof createClinicMemberRequestSchema
>;
export type UpdateClinicMemberRequest = z.infer<
  typeof updateClinicMemberRequestSchema
>;

export const createJoinRequestSchema = z.object({
  clinicId: z.string().cuid(),
  requestedRole: z.enum(["DOCTOR", "NURSE", "RECEPTIONIST", "ADMIN_DOCTOR"]),
  message: z.string().max(500).optional(),
});

export const approveJoinRequestSchema = z.object({
  assignedRole: z
    .enum(["DOCTOR", "NURSE", "RECEPTIONIST", "ADMIN_DOCTOR"])
    .optional(),
  welcomeMessage: z.string().max(500).optional(),
});

export const rejectJoinRequestSchema = z.object({
  reason: z.string().min(10).max(500),
});

export const searchClinicsQuerySchema = z.object({
  query: z.string().min(1),
});

export type CreateJoinRequest = z.infer<typeof createJoinRequestSchema>;
export type ApproveJoinRequest = z.infer<typeof approveJoinRequestSchema>;
export type RejectJoinRequest = z.infer<typeof rejectJoinRequestSchema>;
export type SearchClinicsQuery = z.infer<typeof searchClinicsQuerySchema>;

export const clinicApiQuotaUpsertSchema = z.object({
  rps: z.number().int().min(1).max(10_000),
  rpm: z.number().int().min(1).max(1_000_000),
  monthlyBudget: z.number().int().min(1).max(1_000_000_000),
  notes: z.string().max(500).optional(),
});

export const clinicApiQuotaResponseSchema = z.object({
  clinicId: z.string(),
  rps: z.number().int(),
  rpm: z.number().int(),
  monthlyBudget: z.number().int(),
  currentMonthUsed: z.number().int(),
  currentMonthResetsAt: z.string(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ClinicApiQuotaUpsertRequest = z.infer<
  typeof clinicApiQuotaUpsertSchema
>;
export type ClinicApiQuotaResponse = z.infer<
  typeof clinicApiQuotaResponseSchema
>;
