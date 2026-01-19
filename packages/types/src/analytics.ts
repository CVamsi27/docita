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

// ... types

export type DiseaseTrend = z.infer<typeof DiseaseTrendSchema> & {
    disease?: string;      // from local usage
    count?: number;        // from local usage
    percentage?: number;   // from local usage

};

export type AnalyticsOverview = z.infer<typeof OverviewStatsSchema> & {
    patientGrowth?: number;
    newPatientsThisMonth?: number;
    appointmentsThisMonth?: number;
    revenueThisMonth?: number;
    revenueGrowth?: number;
    // Allow for keys used in UI not yet in schema

};

export interface ComplianceMetric {
    category: string;
    score: number;
    issues: number;
    status: 'compliant' | 'warning' | 'critical' | 'good'; // include 'good' for transition
    metric?: string; // from local usage
    value?: number; // from local usage
}

export interface RevenueByCPT {
    code: string;
    description: string;
    revenue: number;
    count: number;
    cptCode?: string; // from local usage
    [key: string]: string | number | undefined;
}

export interface RevenueMetric {
  totalRevenue: number;
  invoiceCount: number;
  avgInvoiceAmount: number;
  date: string;
}

export interface AppointmentSnapshot {
  total: number;
  booked: number;
  completed: number;
  cancelled: number;
  noShow: number;
  fillRate: number;
  completionRate: number;
}

export interface DemographicsSnapshot {
  totalPatients: number;
  newPatients: number;
  ageDistribution: Record<string, number>;
  genderDistribution: {
    MALE: number;
    FEMALE: number;
    OTHER: number;
  };
}

export interface OverviewMetrics {
  totalPatients: number;
  newPatientsThisMonth: number;
  patientGrowth: number;
  totalAppointments: number;
  appointmentsThisMonth: number;
  revenueThisMonth: number;
  revenueGrowth: number;
}

export interface RevenueTrendPoint {
  date: string;
  revenue: number;
  dateStr?: string; // Legacy support
}

export interface PatientGrowthPoint {
  date: string;
  count: number;
}

export interface DiseaseTrendPoint {
  icdCode: { code: string; description: string; category: string } | undefined;
  count: number;
}

export interface ComplianceMetrics {
  totalVisits: number;
  codedVisits: number;
  billedVisits: number;
  codingCompletenessRate: number;
  billingRate: number;
  primaryDiagnosisRate: number;
  avgDiagnosesPerVisit: number;
  avgProceduresPerVisit: number;
  proceduresWithoutPrice: number;
  unbilledProceduresRate: number;
}

export interface TopCondition {
  condition: string;
  count: number;
  percentage: number;
}

export interface CptRevenueMetric {
  cptCode:
    | { code: string; description: string; price: number; category: string }
    | undefined;
  procedureCount: number;
  totalRevenue: number;
  avgPrice: number;
}
