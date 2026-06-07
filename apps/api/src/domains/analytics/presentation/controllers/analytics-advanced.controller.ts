// jscpd:ignore-start
import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AnalyticsService } from '@/domains/analytics/application/services/analytics.service';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import {
  RequireFeature,
  Feature,
} from '@/shared/modules/auth/auth/tier.decorator';
import { APP_ACCESS_TARGETS } from '@workspace/types';
import {
  getDbRolesForTarget,
  requireFeatureForTarget,
} from '@/shared/modules/auth/auth/access-matrix.util';
import {
  AnalyticsDateRangeQueryDto,
  AnalyticsPeriodDateRangeQueryDto,
  AnalyticsTimeSeriesQueryDto,
  AppointmentMetricsResponseDto,
  DiseaseTimeSeriesListResponseDto,
  RevenueByCategoryListResponseDto,
  RevenueByCptListResponseDto,
  RevenueMetricsListResponseDto,
  RevenueTimeSeriesListResponseDto,
  CodingComplianceMetricsResponseDto,
  CodingTimelinessResponseDto,
  UncodedVisitsStatsResponseDto,
  PatientDemographicsResponseDto,
} from '@/domains/analytics/application/dto/analytics.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { requireClinicIdFromRequest } from '@/shared/modules/auth/auth/clinic-request-context';
import { parseAnalyticsDate } from '@/domains/analytics/presentation/controllers/analytics-controller.helpers';

@Controller('analytics')
@Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_ANALYTICS))
@UseGuards(TierGuard)
@RequireFeature(requireFeatureForTarget(APP_ACCESS_TARGETS.API_ANALYTICS))
export class AnalyticsAdvancedController {
// jscpd:ignore-end
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('disease-trends/time-series')
  @RequireFeature(Feature.ADVANCED_ANALYTICS)
  @ZodSerializerDto(DiseaseTimeSeriesListResponseDto)
  getDiseaseTimeSeries(
    @Request() req: RequestWithUser,
    @Query() query: AnalyticsTimeSeriesQueryDto,
  ) {
    return this.analyticsService.getDiseaseTimeSeries(
      requireClinicIdFromRequest(req),
      new Date(query.startDate),
      new Date(query.endDate),
      query.groupBy ?? 'month',
    );
  }

  @Get('revenue/by-cpt')
  @RequireFeature(Feature.ADVANCED_ANALYTICS)
  @ZodSerializerDto(RevenueByCptListResponseDto)
  getRevenueByCptCode(
    @Request() req: RequestWithUser,
    @Query() query: AnalyticsDateRangeQueryDto,
  ) {
    return this.analyticsService.getRevenueByCptCode(
      requireClinicIdFromRequest(req),
      parseAnalyticsDate(query.startDate),
      parseAnalyticsDate(query.endDate),
    );
  }

  @Get('revenue/by-category')
  @RequireFeature(Feature.ADVANCED_ANALYTICS)
  @ZodSerializerDto(RevenueByCategoryListResponseDto)
  getRevenueByCategory(
    @Request() req: RequestWithUser,
    @Query() query: AnalyticsDateRangeQueryDto,
  ) {
    return this.analyticsService.getRevenueByCategory(
      requireClinicIdFromRequest(req),
      parseAnalyticsDate(query.startDate),
      parseAnalyticsDate(query.endDate),
    );
  }

  @Get('revenue/time-series')
  @RequireFeature(Feature.ADVANCED_ANALYTICS)
  @ZodSerializerDto(RevenueTimeSeriesListResponseDto)
  getRevenueTimeSeries(
    @Request() req: RequestWithUser,
    @Query() query: AnalyticsTimeSeriesQueryDto,
  ) {
    return this.analyticsService.getRevenueTimeSeries(
      requireClinicIdFromRequest(req),
      new Date(query.startDate),
      new Date(query.endDate),
      query.groupBy ?? 'month',
    );
  }

  @Get('compliance/metrics')
  @RequireFeature(Feature.ADVANCED_ANALYTICS)
  @ZodSerializerDto(CodingComplianceMetricsResponseDto)
  getCodingComplianceMetrics(
    @Request() req: RequestWithUser,
    @Query() query: AnalyticsDateRangeQueryDto,
  ) {
    return this.analyticsService.getCodingComplianceMetrics(
      requireClinicIdFromRequest(req),
      parseAnalyticsDate(query.startDate),
      parseAnalyticsDate(query.endDate),
    );
  }

  @Get('compliance/uncoded-stats')
  @RequireFeature(Feature.ADVANCED_ANALYTICS)
  @ZodSerializerDto(UncodedVisitsStatsResponseDto)
  getUncodedVisitsStats(@Request() req: RequestWithUser) {
    return this.analyticsService.getUncodedVisitsStats(
      requireClinicIdFromRequest(req),
    );
  }

  @Get('compliance/timeliness')
  @RequireFeature(Feature.ADVANCED_ANALYTICS)
  @ZodSerializerDto(CodingTimelinessResponseDto)
  getCodingTimeliness(
    @Request() req: RequestWithUser,
    @Query() query: AnalyticsDateRangeQueryDto,
  ) {
    return this.analyticsService.getCodingTimeliness(
      requireClinicIdFromRequest(req),
      parseAnalyticsDate(query.startDate),
      parseAnalyticsDate(query.endDate),
    );
  }

  @Get('revenue-metrics')
  @RequireFeature(Feature.ADVANCED_ANALYTICS)
  @ZodSerializerDto(RevenueMetricsListResponseDto)
  getRevenueMetrics(
    @Request() req: RequestWithUser,
    @Query() query: AnalyticsPeriodDateRangeQueryDto,
  ) {
    return this.analyticsService.getRevenueMetrics(
      requireClinicIdFromRequest(req),
      query.period ?? 'monthly',
      parseAnalyticsDate(query.startDate),
      parseAnalyticsDate(query.endDate),
    );
  }

  @Get('appointment-metrics')
  @RequireFeature(Feature.ADVANCED_ANALYTICS)
  @ZodSerializerDto(AppointmentMetricsResponseDto)
  getAppointmentMetrics(
    @Request() req: RequestWithUser,
    @Query() query: AnalyticsPeriodDateRangeQueryDto,
  ) {
    return this.analyticsService.getAppointmentMetrics(
      requireClinicIdFromRequest(req),
      query.period ?? 'monthly',
      parseAnalyticsDate(query.startDate),
      parseAnalyticsDate(query.endDate),
    );
  }

  @Get('patient-demographics')
  @RequireFeature(Feature.ADVANCED_ANALYTICS)
  @ZodSerializerDto(PatientDemographicsResponseDto)
  getPatientDemographics(
    @Request() req: RequestWithUser,
    @Query() query: AnalyticsDateRangeQueryDto,
  ) {
    return this.analyticsService.getPatientDemographics(
      requireClinicIdFromRequest(req),
      parseAnalyticsDate(query.startDate),
      parseAnalyticsDate(query.endDate),
    );
  }
}
