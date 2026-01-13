import { z } from "zod";

import { clinicTypeSchema, ClinicType } from "./users";

export const ClinicTier = z.enum(["FREE", "CAPTURE", "GROWTH", "ENTERPRISE"]);
// ClinicType removed, simplified to import
export const IntelligenceAddonStatus = z.enum(["NONE", "ACTIVE"]);

export const clinicSchema = z.object({
    id: z.string(),
    name: z.string(),
    address: z.string(),
    phone: z.string(),
    email: z.string().email(),
    website: z.string().nullable().optional(),
    logo: z.string().nullable().optional(),
    active: z.boolean(),
    tier: z.string().or(ClinicTier),
    type: z.string().or(clinicTypeSchema),
    settings: z.any().nullable().optional(), // Json
    timezone: z.string(),
    locale: z.string(),
    currency: z.string(),
    createdAt: z.date().or(z.string()),
    updatedAt: z.date().or(z.string()),
    subscriptionStatus: z.string(),
    branding: z.any().nullable().optional(), // Json
    features: z.any().nullable().optional(), // Json
    whatsappAutomation: z.any().nullable().optional(), // Json
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
});

export type Clinic = z.infer<typeof clinicSchema>;
