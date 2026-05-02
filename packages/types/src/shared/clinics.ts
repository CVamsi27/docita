import { z } from "zod";

import { clinicTypeSchema } from "./users";
import { jsonObjectSchema } from "./json-schema";

export const ClinicTier = z.enum(["FREE", "CAPTURE", "GROWTH", "ENTERPRISE"]);

export const IntelligenceAddonStatus = z.enum(["NONE", "ACTIVE"]);

export const whatsAppAutomationSchema = z.object({
  enabled: z.boolean().default(false),
  prescriptionSent: z.boolean().optional(),
  invoiceSent: z.boolean().optional(),
  appointmentReminder: z.boolean().optional(),
  appointmentConfirmation: z.boolean().optional(),
});

export const clinicSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  phone: z.string(),
  email: z.string().email(),
  website: z.string().nullable().optional(),
  gstin: z.string().nullable().optional(),
  logo: z.string().nullable().optional(),
  active: z.boolean(),
  tier: z.string().or(ClinicTier),
  type: z.string().or(clinicTypeSchema),
  settings: jsonObjectSchema.nullable().optional(),
  timezone: z.string(),
  locale: z.string(),
  currency: z.string(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
  subscriptionStatus: z.string(),
  subscriptionGraceUntil: z.date().or(z.string()).nullable().optional(),
  branding: jsonObjectSchema.nullable().optional(),
  features: jsonObjectSchema.nullable().optional(),
  whatsappAutomation: whatsAppAutomationSchema.nullable().optional(),
  intelligenceAddon: z.string().or(IntelligenceAddonStatus),
  trialEndsAt: z.date().or(z.string()).nullable().optional(),
  avgConsultationMinutes: z.number(),
  lateArrivalGraceMinutes: z.number(),
  queueBufferMinutes: z.number(),
  useDoctorQueues: z.boolean(),
  mrnPrefix: z.string().nullable().optional(),
  razorpayCustomerId: z.string().nullable().optional(),
  referralCode: z.string().nullable().optional(),
  domain: z.string().nullable().optional(),
  referralCreditsMonths: z.number(),
  slaSignatureUrl: z.string().nullable().optional(),
  slaSignatureStoredUrl: z.string().nullable().optional(),
  slaSignatureAcceptedAt: z.date().or(z.string()).nullable().optional(),
});

export type Clinic = z.infer<typeof clinicSchema>;
