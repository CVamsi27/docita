import { z } from "zod";
import { clinicSchema } from "../shared/clinics";
import { userSchema } from "../shared/users/doctor-profile";

export const internalClinicAdminTypeSchema = z.enum(["admin", "admin_doctor"]);
export type InternalClinicAdminType = z.infer<
  typeof internalClinicAdminTypeSchema
>;

/**
 * Internal-admin clinic management. Migrated to Zod (2026-08-11, AGENTS
 * §3.1) so the canonical schema lives in packages/types and the API can
 * wire it through `createZodDto` + `ZodValidationPipe`. The runtime `tier`
 * enum is locked to the 5-value `ClinicTier` Prisma enum (the only values
 * the DB can actually store today).
 */
export const internalCreateClinicRequestSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  address: z.string().min(1),
  tier: z
    .enum(["STARTER", "ESSENTIAL", "PROFESSIONAL", "HOSPITAL", "ENTERPRISE"])
    .optional(),
  website: z.string().optional(),
  mrnPrefix: z.string().optional(),
  timezone: z.string().optional(),
  adminEmail: z.string().email(),
  adminName: z.string().min(1),
  adminPassword: z.string().min(8),
});
export type CreateClinicDto = z.infer<typeof internalCreateClinicRequestSchema>;

export const internalUpdateClinicRequestSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  tier: z
    .enum(["STARTER", "ESSENTIAL", "PROFESSIONAL", "HOSPITAL", "ENTERPRISE"])
    .optional(),
  type: z.string().optional(),
  active: z.boolean().optional(),
});
export type UpdateClinicDto = z.infer<typeof internalUpdateClinicRequestSchema>;

export const internalCreateAdminRequestSchema = z.object({
  clinicId: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  phoneNumber: z.string().optional(),
  adminType: z.enum(["admin", "admin_doctor"]),
});
export type CreateAdminDto = z.infer<typeof internalCreateAdminRequestSchema>;

export const internalUpdateAdminRequestSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string().optional(),
  adminType: z.enum(["admin", "admin_doctor"]).optional(),
});
export type UpdateAdminDto = z.infer<typeof internalUpdateAdminRequestSchema>;

export const internalUpdateClinicAIFeaturesRequestSchema = z.object({
  enabled: z.boolean(),
  features: z
    .object({
      predictiveAnalytics: z.boolean().optional(),
      automatedDiagnosis: z.boolean().optional(),
      patientInsights: z.boolean().optional(),
      appointmentOptimization: z.boolean().optional(),
      prescriptionAssistant: z.boolean().optional(),
    })
    .optional(),
});
export type UpdateClinicAIFeaturesDto = z.infer<
  typeof internalUpdateClinicAIFeaturesRequestSchema
>;

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

export const internalDashboardTrendsSchema = z.object({
  clinicsThisMonth: z.number(),
  usersThisMonth: z.number(),
  doctorsThisMonth: z.number(),
  patientsThisMonth: z.number(),
  invoicesPercentChange: z.number(),
  prescriptionsPercentChange: z.number(),
});
export type InternalDashboardTrends = z.infer<
  typeof internalDashboardTrendsSchema
>;

export const internalDashboardStatsSchema = z.object({
  clinics: z.number(),
  users: z.number(),
  doctors: z.number(),
  patients: z.number(),
  invoices: z.number(),
  prescriptions: z.number(),
  trends: internalDashboardTrendsSchema.optional(),
});
export type InternalDashboardStats = z.infer<
  typeof internalDashboardStatsSchema
>;

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

export const internalClinicListEntrySchema = clinicSchema
  .pick({
    id: true,
    name: true,
    email: true,
    phone: true,
    address: true,
    tier: true,
    active: true,
    subscriptionStatus: true,
    createdAt: true,
    type: true,
  })
  .extend({
    _count: z.object({
      users: z.number().int().nonnegative(),
      patients: z.number().int().nonnegative(),
    }),
  });
export type InternalClinicListEntry = z.infer<
  typeof internalClinicListEntrySchema
>;

export const internalClinicListResponseSchema = z.object({
  items: z.array(internalClinicListEntrySchema),
  nextCursor: z.string().optional(),
  hasMore: z.boolean(),
  count: z.number().int().nonnegative(),
});
export type InternalClinicListResponse = z.infer<
  typeof internalClinicListResponseSchema
>;

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
 * (matching the internal pages and the internal e2e critical-flows
 * contract) composed from the canonical `userSchema` so role/verification
 * fields stay derived from the single source of truth.
 */
export const internalAdminListEntrySchema = userSchema.extend({
  appLoginDisabled: z.boolean(),
});
export type InternalAdminListEntry = z.infer<
  typeof internalAdminListEntrySchema
>;

export const internalUserListEntrySchema = userSchema.extend({
  clinicName: z.string().optional(),
});
export type InternalUserListEntry = z.infer<typeof internalUserListEntrySchema>;
