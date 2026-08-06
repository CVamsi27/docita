import { z } from "zod";
import { clinicSchema } from "../shared/clinics";
import { userSchema } from "../shared/users/doctor-profile";

export const internalClinicAdminTypeSchema = z.enum(["admin", "admin_doctor"]);
export type InternalClinicAdminType = z.infer<
  typeof internalClinicAdminTypeSchema
>;

export type ClinicTierType =
  | "STARTER"
  | "ESSENTIAL"
  | "PROFESSIONAL"
  | "HOSPITAL"
  | "ENTERPRISE"
  | "FRONT_DESK"
  | "FRONT_DESK_CLINIC"
  | "FRONT_DESK_HOSPITAL"
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
  uptimeSeconds: z.number(),
  uptimeFormatted: z.string(),
  avgResponseTime: z.number(),
  requestsLastHour: z.number(),
  requestsPerMinute: z.number(),
  errorsLastHour: z.number(),
  errorRate: z.number(),
  memoryUsage: z.object({
    rss: z.number(),
    heapTotal: z.number(),
    heapUsed: z.number(),
    external: z.number(),
  }),
  cpuUsage: z.object({
    user: z.number(),
    system: z.number(),
  }),
  databaseConnected: z.boolean(),
  lastErrors: z.number(),
  healthChecks: z.array(
    z.object({
      name: z.string(),
      status: z.string(),
      value: z.string(),
      description: z.string(),
    }),
  ),
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

export const internalTierPricingRowSchema = z.object({
  tier: z.string(),
  name: z.string(),
  price: z.number().nullable(),
  maxDoctors: z.number(),
  aiEnabled: z.boolean(),
});

export const internalTierPricingSchema = z.array(internalTierPricingRowSchema);

export const internalClinicListResponseSchema = z.object({
  data: z.array(clinicSchema),
  nextCursor: z.string().optional(),
});

export const internalClinicAdminSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phoneNumber: z.string().nullable().optional(),
  role: z.enum(["ADMIN", "ADMIN_DOCTOR"]),
  appLoginDisabled: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type InternalClinicAdmin = z.infer<typeof internalClinicAdminSchema>;

export const internalClinicAdminListResponseSchema = z.object({
  data: z.array(internalClinicAdminSchema),
});
export type InternalClinicAdminListResponse = z.infer<
  typeof internalClinicAdminListResponseSchema
>;

/**
 * Cross-clinic internal console list shapes (P5.11). Both are plain arrays
 * (matching the internal-vite pages and the internal e2e critical-flows
 * contract) composed from the canonical `userSchema` so role/verification
 * fields stay derived from the single source of truth.
 */
export const internalAdminListEntrySchema = userSchema.extend({
  appLoginDisabled: z.boolean(),
});
export type InternalAdminListEntry = z.infer<typeof internalAdminListEntrySchema>;

export const internalUserListEntrySchema = userSchema.extend({
  clinicName: z.string().optional(),
});
export type InternalUserListEntry = z.infer<typeof internalUserListEntrySchema>;
