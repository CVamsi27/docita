import { z } from "zod";
import { clinicSchema } from "./clinics";

export const superAdminGlobalStatsSchema = z.object({
    totalClinics: z.number(),
    activeClinics: z.number(),
    totalDoctors: z.number(),
    totalPatients: z.number(),
    totalRevenue: z.number(),
    growthRate: z.number(),
});

export const superAdminAnalyticsSchema = z.object({
    period: z.string(),
    data: z.array(z.object({
        date: z.string(),
        clinics: z.number(),
        revenue: z.number(),
    })),
});

export const superAdminPerformanceMetricsSchema = z.object({
    apiLatency: z.number(),
    errorRate: z.number(),
    cpuUsage: z.number(),
    memoryUsage: z.number(),
    activeConnections: z.number(),
});

export const superAdminAIFeatureCatalogSchema = z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    pricePerUnit: z.number(),
    unit: z.string(),
    isBeta: z.boolean(),
}));

export const superAdminClinicTierInfoSchema = z.object({
    clinicId: z.string(),
    tier: z.string(),
    features: z.array(z.string()),
    usage: z.record(z.number()),
    billingStatus: z.string(),
});

export const superAdminTierPricingSchema = z.array(z.object({
    tier: z.string(),
    monthlyPrice: z.number(),
    yearlyPrice: z.number(),
    features: z.array(z.string()),
}));

export const superAdminClinicListResponseSchema = z.object({
    data: z.array(clinicSchema),
    nextCursor: z.string().optional(),
});
