import { z } from "zod";
import {
  AppointmentStatsSchema,
  DiseaseTrendSchema,
  OverviewStatsSchema,
  PatientGrowthSchema,
  RevenueTrendSchema,
  TopDiagnosisSchema,
} from "../admin/analytics";
import { dashboardStatsSchema } from "../admin/dashboard";

export const analyticsPeriodSchema = z.enum(["daily", "weekly", "monthly"]);
export const analyticsGroupBySchema = z.enum(["day", "week", "month"]);

export const analyticsDateRangeQuerySchema = z.object({
  clinicId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const analyticsPeriodQuerySchema = z.object({
  clinicId: z.string().optional(),
  period: analyticsPeriodSchema.optional(),
});

export const analyticsDaysQuerySchema = z.object({
  clinicId: z.string().optional(),
  days: z.coerce.number().int().positive().optional(),
});

export const analyticsPeriodDaysQuerySchema = analyticsPeriodQuerySchema.extend({
  days: z.coerce.number().int().positive().optional(),
});

export const analyticsLimitQuerySchema = z.object({
  clinicId: z.string().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

export const analyticsPeriodDateRangeQuerySchema =
  analyticsDateRangeQuerySchema.extend({
    period: analyticsPeriodSchema.optional(),
  });

export const analyticsTimeSeriesQuerySchema = z.object({
  clinicId: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  groupBy: analyticsGroupBySchema.optional(),
});

export const analyticsOverviewResponseSchema = OverviewStatsSchema;
export const analyticsRevenueTrendListResponseSchema = z.array(
  RevenueTrendSchema,
);
export const analyticsPatientGrowthListResponseSchema = z.array(
  PatientGrowthSchema,
);
export const analyticsAppointmentStatsResponseSchema = AppointmentStatsSchema;
export const analyticsTopDiagnosisListResponseSchema = z.array(
  TopDiagnosisSchema,
);
export const analyticsDiseaseTrendListResponseSchema = z.array(
  DiseaseTrendSchema,
);

export const analyticsDiseaseTrendByCategoryResponseSchema = z.array(
  z.object({
    category: z.string(),
    count: z.number().int(),
  }),
);

export const analyticsDiseaseTimeSeriesResponseSchema = z.array(
  z.object({
    period: z.string(),
    diagnoses: z.array(
      z.object({
        code: z.string(),
        count: z.number().int(),
      }),
    ),
  }),
);

export const analyticsRevenueByCptListResponseSchema = z.array(
  z.object({
    cptCode: z
      .object({
        code: z.string(),
        description: z.string(),
        price: z.number(),
        category: z.string(),
      })
      .optional(),
    procedureCount: z.number().int(),
    totalRevenue: z.number(),
    avgPrice: z.number(),
  }),
);

export const analyticsRevenueByCategoryListResponseSchema = z.array(
  z.object({
    category: z.string(),
    count: z.number().int(),
    revenue: z.number(),
  }),
);

export const analyticsRevenueTimeSeriesResponseSchema = z.array(
  z.object({
    period: z.string(),
    revenue: z.number(),
  }),
);

export const analyticsCodingComplianceMetricsResponseSchema = z.object({
  totalVisits: z.number().int(),
  codedVisits: z.number().int(),
  billedVisits: z.number().int(),
  codingCompletenessRate: z.number(),
  billingRate: z.number(),
  primaryDiagnosisRate: z.number(),
  avgDiagnosesPerVisit: z.number(),
  avgProceduresPerVisit: z.number(),
  proceduresWithoutPrice: z.number().int(),
  unbilledProceduresRate: z.number(),
});

export const analyticsUncodedVisitsStatsResponseSchema = z.object({
  totalUncoded: z.number().int(),
  uncodedOlderThan7Days: z.number().int(),
  recentUncoded: z.number().int(),
});

export const analyticsCodingTimelinessResponseSchema = z.object({
  avgTimeToCodeHours: z.number(),
  distribution: z.object({
    within24h: z.number().int(),
    within48h: z.number().int(),
    within72h: z.number().int(),
    over72h: z.number().int(),
  }),
  totalCoded: z.number().int(),
});

export const analyticsRevenueMetricsResponseSchema = z.array(
  z.object({
    date: z.string(),
    totalRevenue: z.number(),
    invoiceCount: z.number().int(),
    avgInvoiceAmount: z.number(),
  }),
);

export const analyticsAppointmentMetricsResponseSchema = z.object({
  total: z.number().int(),
  booked: z.number().int(),
  completed: z.number().int(),
  cancelled: z.number().int(),
  noShow: z.number().int(),
  fillRate: z.number(),
  completionRate: z.number(),
});

export const analyticsPatientDemographicsResponseSchema = z.object({
  totalPatients: z.number().int(),
  newPatients: z.number().int(),
  ageDistribution: z.record(z.string(), z.number().int()),
  genderDistribution: z.object({
    MALE: z.number().int(),
    FEMALE: z.number().int(),
    OTHER: z.number().int(),
  }),
});

export const analyticsTopConditionListResponseSchema = z.array(
  z.object({
    condition: z.string(),
    count: z.number().int(),
    percentage: z.number(),
  }),
);

export const dashboardStatsResponseSchema = dashboardStatsSchema;

export type AnalyticsDateRangeQuery = z.infer<
  typeof analyticsDateRangeQuerySchema
>;
export type AnalyticsPeriodQuery = z.infer<typeof analyticsPeriodQuerySchema>;
export type AnalyticsDaysQuery = z.infer<typeof analyticsDaysQuerySchema>;
export type AnalyticsPeriodDaysQuery = z.infer<
  typeof analyticsPeriodDaysQuerySchema
>;
export type AnalyticsLimitQuery = z.infer<typeof analyticsLimitQuerySchema>;
export type AnalyticsPeriodDateRangeQuery = z.infer<
  typeof analyticsPeriodDateRangeQuerySchema
>;
export type AnalyticsTimeSeriesQuery = z.infer<
  typeof analyticsTimeSeriesQuerySchema
>;

export type AnalyticsRevenueMetricsResponse = z.infer<
  typeof analyticsRevenueMetricsResponseSchema
>;
export type AnalyticsAppointmentMetricsResponse = z.infer<
  typeof analyticsAppointmentMetricsResponseSchema
>;
export type AnalyticsPatientDemographicsResponse = z.infer<
  typeof analyticsPatientDemographicsResponseSchema
>;
export type AnalyticsTopConditionListResponse = z.infer<
  typeof analyticsTopConditionListResponseSchema
>;
export type AnalyticsRevenueByCptListResponse = z.infer<
  typeof analyticsRevenueByCptListResponseSchema
>;
export type AnalyticsCodingComplianceMetricsResponse = z.infer<
  typeof analyticsCodingComplianceMetricsResponseSchema
>;