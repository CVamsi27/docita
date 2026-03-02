import { createZodDto } from 'nestjs-zod';
import {
  analyticsAppointmentMetricsResponseSchema,
  analyticsAppointmentStatsResponseSchema,
  analyticsCodingComplianceMetricsResponseSchema,
  analyticsCodingTimelinessResponseSchema,
  analyticsDateRangeQuerySchema,
  analyticsDaysQuerySchema,
  analyticsDiseaseTimeSeriesResponseSchema,
  analyticsDiseaseTrendByCategoryResponseSchema,
  analyticsDiseaseTrendListResponseSchema,
  analyticsLimitQuerySchema,
  analyticsOverviewResponseSchema,
  analyticsPatientDemographicsResponseSchema,
  analyticsPatientGrowthListResponseSchema,
  analyticsPeriodDateRangeQuerySchema,
  analyticsPeriodDaysQuerySchema,
  analyticsRevenueByCategoryListResponseSchema,
  analyticsRevenueByCptListResponseSchema,
  analyticsRevenueMetricsResponseSchema,
  analyticsRevenueTimeSeriesResponseSchema,
  analyticsRevenueTrendListResponseSchema,
  analyticsTimeSeriesQuerySchema,
  analyticsTopConditionListResponseSchema,
  analyticsTopDiagnosisListResponseSchema,
  analyticsUncodedVisitsStatsResponseSchema,
} from '@workspace/types';

export class OverviewStatsResponseDto extends createZodDto(
  analyticsOverviewResponseSchema,
) {}
export class RevenueTrendListResponseDto extends createZodDto(
  analyticsRevenueTrendListResponseSchema,
) {}
export class PatientGrowthListResponseDto extends createZodDto(
  analyticsPatientGrowthListResponseSchema,
) {}
export class AppointmentStatsResponseDto extends createZodDto(
  analyticsAppointmentStatsResponseSchema,
) {}
export class TopDiagnosisListResponseDto extends createZodDto(
  analyticsTopDiagnosisListResponseSchema,
) {}
export class DiseaseTrendListResponseDto extends createZodDto(
  analyticsDiseaseTrendListResponseSchema,
) {}

export class AnalyticsPeriodDaysQueryDto extends createZodDto(
  analyticsPeriodDaysQuerySchema,
) {}

export class AnalyticsDaysQueryDto extends createZodDto(
  analyticsDaysQuerySchema,
) {}

export class AnalyticsLimitQueryDto extends createZodDto(
  analyticsLimitQuerySchema,
) {}

export class AnalyticsDateRangeQueryDto extends createZodDto(
  analyticsDateRangeQuerySchema,
) {}

export class AnalyticsPeriodDateRangeQueryDto extends createZodDto(
  analyticsPeriodDateRangeQuerySchema,
) {}

export class AnalyticsTimeSeriesQueryDto extends createZodDto(
  analyticsTimeSeriesQuerySchema,
) {}

export class DiseaseTrendByCategoryListResponseDto extends createZodDto(
  analyticsDiseaseTrendByCategoryResponseSchema,
) {}

export class DiseaseTimeSeriesListResponseDto extends createZodDto(
  analyticsDiseaseTimeSeriesResponseSchema,
) {}

export class RevenueByCptListResponseDto extends createZodDto(
  analyticsRevenueByCptListResponseSchema,
) {}

export class RevenueByCategoryListResponseDto extends createZodDto(
  analyticsRevenueByCategoryListResponseSchema,
) {}

export class RevenueTimeSeriesListResponseDto extends createZodDto(
  analyticsRevenueTimeSeriesResponseSchema,
) {}

export class CodingComplianceMetricsResponseDto extends createZodDto(
  analyticsCodingComplianceMetricsResponseSchema,
) {}

export class UncodedVisitsStatsResponseDto extends createZodDto(
  analyticsUncodedVisitsStatsResponseSchema,
) {}

export class CodingTimelinessResponseDto extends createZodDto(
  analyticsCodingTimelinessResponseSchema,
) {}

export class RevenueMetricsListResponseDto extends createZodDto(
  analyticsRevenueMetricsResponseSchema,
) {}

export class AppointmentMetricsResponseDto extends createZodDto(
  analyticsAppointmentMetricsResponseSchema,
) {}

export class PatientDemographicsResponseDto extends createZodDto(
  analyticsPatientDemographicsResponseSchema,
) {}

export class TopConditionListResponseDto extends createZodDto(
  analyticsTopConditionListResponseSchema,
) {}
