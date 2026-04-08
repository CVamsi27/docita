import { z } from "zod";
import { clinicSchema } from "../shared/clinics";

export type ClinicTierType =
  | "CAPTURE"
  | "CORE"
  | "PLUS"
  | "PRO"
  | "ENTERPRISE"
  | "INTELLIGENCE";

export interface CreateClinicDto {
  name: string;
  email: string;
  phone: string;
  address: string;
  tier?: ClinicTierType;
  website?: string;
  mrnPrefix?: string;
  timezone?: string;
  adminEmail: string;
  adminName: string;
  adminPassword: string;
}

export interface CreateAdminDto {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  adminType: "admin" | "admin_doctor";
  qualification?: string;
  registrationNumber?: string;
  specialization?: string;
}

export interface UpdateAdminDto {
  name?: string;
  email?: string;
  phoneNumber?: string;
  adminType?: "admin" | "admin_doctor";
  qualification?: string;
  registrationNumber?: string;
  specialization?: string;
}

export interface UpdateClinicAIFeaturesDto {
  enabled?: boolean;
  features?: {
    predictiveAnalytics?: boolean;
    automatedDiagnosis?: boolean;
    patientInsights?: boolean;
    appointmentOptimization?: boolean;
    prescriptionAssistant?: boolean;
  };
}

export interface InternalPaymentData {
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpaySignature?: string;
}

export const internalGlobalStatsSchema = z.object({
  totalClinics: z.number(),
  activeClinics: z.number(),
  totalDoctors: z.number(),
  totalPatients: z.number(),
  totalRevenue: z.number(),
  growthRate: z.number(),
});

export const internalAnalyticsSchema = z.object({
  period: z.string(),
  data: z.array(
    z.object({
      date: z.string(),
      clinics: z.number(),
      revenue: z.number(),
    }),
  ),
});

export const internalPerformanceMetricsSchema = z.object({
  apiLatency: z.number(),
  errorRate: z.number(),
  cpuUsage: z.number(),
  memoryUsage: z.number(),
  activeConnections: z.number(),
});

export const internalAIFeatureCatalogSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    pricePerUnit: z.number(),
    unit: z.string(),
    isBeta: z.boolean(),
  }),
);

export const internalClinicTierInfoSchema = z.object({
  clinicId: z.string(),
  tier: z.string(),
  features: z.array(z.string()),
  usage: z.record(z.number()),
  billingStatus: z.string(),
});

export const internalTierPricingSchema = z.array(
  z.object({
    tier: z.string(),
    monthlyPrice: z.number(),
    yearlyPrice: z.number(),
    features: z.array(z.string()),
  }),
);

export const internalClinicListResponseSchema = z.object({
  data: z.array(clinicSchema),
  nextCursor: z.string().optional(),
});
