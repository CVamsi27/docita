import { z } from "zod";
import { clinicSchema, enterpriseBrandingSchema } from "../shared/clinics";
import { facilityTypeSchema, userSchema } from "../shared/users";

export const appAuthUserSchema = userSchema
  .pick({
    id: true,
    email: true,
    name: true,
    role: true,
    clinicId: true,
    signatureUrl: true,
    registrationNumber: true,
    registrationCouncil: true,
    registrationStateCode: true,
    verificationStatus: true,
    verificationReason: true,
    registrationCertificateUrl: true,
  })
  .extend({
    clinicId: z.string().nullable().optional(),
    emailVerified: z.boolean().optional(),
    onboardingStep: z
      .enum([
        "NOT_STARTED",
        "CHOOSE_PATH",
        "CREATING_CLINIC",
        "JOINING_CLINIC",
        "COMPLETED",
      ])
      .optional(),
  });

export const appClinicSettingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  primaryColor: z.string().optional(),
  compactMode: z.boolean().optional(),
  whatsappNotifications: z.boolean().optional(),
  inAppNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  appointmentAlerts: z.boolean().optional(),
  reportAlerts: z.boolean().optional(),
  reminderBefore: z.union([z.string(), z.number()]).optional(),
  reminderUnit: z.string().optional(),
  twoFactorAuth: z.boolean().optional(),
  sessionTimeout: z.union([z.string(), z.number()]).optional(),
  auditLogs: z.boolean().optional(),
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
  followUpReminderEnabled: z.boolean().optional(),
  followUpReminderBefore: z.string().optional(),
  followUpReminderUnit: z.string().optional(),
  invoiceReminderEnabled: z.boolean().optional(),
  invoiceReminderBefore: z.string().optional(),
  invoiceReminderUnit: z.string().optional(),
  paymentReminderEnabled: z.boolean().optional(),
  paymentReminderDays: z.array(z.number().int().min(1).max(30)).optional(),
  paymentReminderAutoSendWhatsApp: z.boolean().optional(),
  prescriptionReminderEnabled: z.boolean().optional(),
  prescriptionReminderBefore: z.string().optional(),
  prescriptionReminderUnit: z.string().optional(),
  scheduleNotificationEnabled: z.boolean().optional(),
  scheduleNotificationBefore: z.string().optional(),
  scheduleNotificationUnit: z.string().optional(),
  whatsappPreAppointmentEnabled: z.boolean().optional(),
  whatsappPreAppointmentMinutes: z.number().optional(),
  facilityLabel: facilityTypeSchema.optional(),
});

export const appClinicSchema = clinicSchema.extend({
  phoneNumber: z.string().optional(),
  description: z.string().optional(),
  openingTime: z.string().optional(),
  closingTime: z.string().optional(),
  workingDays: z.array(z.string()).optional(),
  consultationDuration: z.number().optional(),
  slotDuration: z.number().optional(),
  countryCode: z.string().optional(),
  facilityType: facilityTypeSchema.optional(),
  enterpriseBranding: enterpriseBrandingSchema.optional(),
});

export const appSessionBootstrapSchema = z.object({
  user: appAuthUserSchema,
  clinic: appClinicSchema.nullable().optional(),
});

export const appComplianceSummarySchema = z.object({
  slaSignatureUrl: z.string().nullable(),
  slaSignatureAcceptedAt: z.string().nullable(),
  consentTemplateEnabled: z.boolean().optional(),
  consentTemplateUpdatedAt: z.string().nullable().optional(),
  withdrawalRequestsOpen: z.number().int().nonnegative().optional(),
  dataExportRequestsOpen: z.number().int().nonnegative().optional(),
  dataDeletionRequestsOpen: z.number().int().nonnegative().optional(),
});

export const appAuditLogSummarySchema = z.object({
  id: z.string(),
  action: z.string(),
  createdAt: z.string(),
  actor: z.object({ name: z.string() }).optional(),
});

export const dataSubjectRequestTypeSchema = z.enum([
  "ACCESS",
  "EXPORT",
  "CORRECTION",
  "DELETION",
  "CONSENT_WITHDRAWAL",
]);

export const dataSubjectRequestStatusSchema = z.enum([
  "OPEN",
  "IN_REVIEW",
  "FULFILLED",
  "REJECTED",
  "CANCELLED",
]);

export const appDataSubjectRequestSchema = z.object({
  id: z.string(),
  clinicId: z.string(),
  patientId: z.string().nullable().optional(),
  requestType: dataSubjectRequestTypeSchema,
  status: dataSubjectRequestStatusSchema,
  requestedByName: z.string().nullable().optional(),
  requestedByRelation: z.string().nullable().optional(),
  requestChannel: z.string().nullable().optional(),
  requestDetails: z.string().nullable().optional(),
  dueAt: z.string().or(z.date()).nullable().optional(),
  completedAt: z.string().or(z.date()).nullable().optional(),
  handledById: z.string().nullable().optional(),
  handledAt: z.string().or(z.date()).nullable().optional(),
  resolutionNotes: z.string().nullable().optional(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});

export const createDataSubjectRequestSchema = z.object({
  patientId: z.string().min(1).nullable().optional(),
  requestType: dataSubjectRequestTypeSchema,
  requestedByName: z.string().trim().max(120).optional(),
  requestedByRelation: z.string().trim().max(80).optional(),
  requestChannel: z.string().trim().max(40).optional(),
  requestDetails: z.string().trim().max(2000).optional(),
  dueAt: z.string().or(z.date()).optional(),
});

export const updateDataSubjectRequestSchema = z.object({
  status: dataSubjectRequestStatusSchema.optional(),
  dueAt: z.string().or(z.date()).nullable().optional(),
  resolutionNotes: z.string().trim().max(2000).optional(),
});

export type AppAuthUser = z.infer<typeof appAuthUserSchema>;
export type AppClinic = z.infer<typeof appClinicSchema>;
export type AppClinicSettings = z.infer<typeof appClinicSettingsSchema>;
export type AppSessionBootstrap = z.infer<typeof appSessionBootstrapSchema>;
export type AppComplianceSummary = z.infer<typeof appComplianceSummarySchema>;
export type AppAuditLogSummary = z.infer<typeof appAuditLogSummarySchema>;
export type DataSubjectRequestType = z.infer<
  typeof dataSubjectRequestTypeSchema
>;
export type DataSubjectRequestStatus = z.infer<
  typeof dataSubjectRequestStatusSchema
>;
export type AppDataSubjectRequest = z.infer<
  typeof appDataSubjectRequestSchema
>;
export type CreateDataSubjectRequest = z.infer<
  typeof createDataSubjectRequestSchema
>;
export type UpdateDataSubjectRequest = z.infer<
  typeof updateDataSubjectRequestSchema
>;
