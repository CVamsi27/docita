import { z } from "zod";

export const AnalyticsPeriod = z.enum(['daily', 'weekly', 'monthly']);
export const AnalyticsGroupBy = z.enum(['day', 'week', 'month']);

export const OverviewStatsSchema = z.object({
    totalPatients: z.number().int(),
    totalAppointments: z.number().int(),
    totalRevenue: z.number(),
    growthRate: z.number().optional(),
});

export const RevenueTrendSchema = z.object({
    date: z.string(),
    revenue: z.number(),
});

export const PatientGrowthSchema = z.object({
    date: z.string(),
    newPatients: z.number().int(),
    totalPatients: z.number().int(),
});

export const AppointmentStatsSchema = z.object({
    total: z.number().int(),
    completed: z.number().int(),
    cancelled: z.number().int(),
    noShow: z.number().int(),
    scheduled: z.number().int(),
});

export const TopDiagnosisSchema = z.object({
    name: z.string(),
    code: z.string(),
    count: z.number().int(),
    percentage: z.number(),
});

// For complex return types, we can use z.any() initially or try to model them accurately if we know the shape.
// Given the service returns "disease trends" etc, likely arrays of objects.

export const DiseaseTrendSchema = z.object({
    name: z.string(),
    data: z.array(z.object({
        date: z.string(),
        count: z.number().int(),
    })),
});

export type AnalyticsPeriod = z.infer<typeof AnalyticsPeriod>;
export type AnalyticsGroupBy = z.infer<typeof AnalyticsGroupBy>;
