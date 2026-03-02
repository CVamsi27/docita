import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AnalyticsService } from '@/domains/analytics/application/services/analytics.service';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import { Role } from '@workspace/db';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import {
  RequireFeature,
  Feature,
} from '@/shared/modules/auth/auth/tier.decorator';
import { RateLimit } from '@/common/interceptors/rate-limit.interceptor';
import {
  AnalyticsDateRangeQueryDto,
  AnalyticsDaysQueryDto,
  AnalyticsLimitQueryDto,
  AnalyticsPeriodDateRangeQueryDto,
  AnalyticsPeriodDaysQueryDto,
  AnalyticsTimeSeriesQueryDto,
  AppointmentMetricsResponseDto,
  OverviewStatsResponseDto,
  RevenueTrendListResponseDto,
  PatientGrowthListResponseDto,
  AppointmentStatsResponseDto,
  TopDiagnosisListResponseDto,
  DiseaseTrendListResponseDto,
  DiseaseTrendByCategoryListResponseDto,
  DiseaseTimeSeriesListResponseDto,
  RevenueByCategoryListResponseDto,
  RevenueByCptListResponseDto,
  RevenueMetricsListResponseDto,
  RevenueTimeSeriesListResponseDto,
  CodingComplianceMetricsResponseDto,
  CodingTimelinessResponseDto,
  UncodedVisitsStatsResponseDto,
  PatientDemographicsResponseDto,
  TopConditionListResponseDto,
} from '@/domains/analytics/dto/analytics.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { RequestWithUser } from '@/common/types/common.types';

@Controller('analytics')
@Roles(Role.ADMIN, Role.DOCTOR, Role.ADMIN_DOCTOR)
@UseGuards(TierGuard)
@RequireFeature(Feature.BASIC_ANALYTICS)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  private parseDate(value?: string): Date | undefined {
    return value ? new Date(value) : undefined;
  }

  @Get('overview')
  @RateLimit({ limit: 30, window: 60000 })
  @ZodSerializerDto(OverviewStatsResponseDto)
  getOverview(@Request() req: RequestWithUser) {
    return this.analyticsService.getOverview(req.user!.clinicId!);
  }

  @Get('revenue')
  @ZodSerializerDto(RevenueTrendListResponseDto)
  getRevenueTrends(
    @Request() req: RequestWithUser,
    @Query() query: AnalyticsPeriodDaysQueryDto,
  ) {
    return this.analyticsService.getRevenueTrends(
      req.user!.clinicId!,
      query.period ?? 'daily',
      query.days ?? 30,
    );
  }

  @Get('patients')
  @ZodSerializerDto(PatientGrowthListResponseDto)
  getPatientGrowth(
    @Request() req: RequestWithUser,
    @Query() query: AnalyticsDaysQueryDto,
  ) {
    return this.analyticsService.getPatientGrowth(
      req.user!.clinicId!,
      query.days ?? 30,
    );
  }

  @Get('appointments')
  @ZodSerializerDto(AppointmentStatsResponseDto)
  getAppointmentStats(@Request() req: RequestWithUser) {
    return this.analyticsService.getAppointmentStats(req.user!.clinicId!);
  }

  @Get('top-diagnoses')
  @ZodSerializerDto(TopDiagnosisListResponseDto)
  getTopDiagnoses(
    @Request() req: RequestWithUser,
    @Query() query: AnalyticsLimitQueryDto,
  ) {
    return this.analyticsService.getTopDiagnoses(
      req.user!.clinicId!,
      query.limit ?? 10,
    );
  }

  @Get('disease-trends')
  @ZodSerializerDto(DiseaseTrendListResponseDto)
  getDiseaseTrends(
    @Request() req: RequestWithUser,
    @Query() query: AnalyticsDateRangeQueryDto,
  ) {
    return this.analyticsService.getDiseaseTrends(
      req.user!.clinicId!,
      this.parseDate(query.startDate),
      this.parseDate(query.endDate),
    );
  }

  @Get('disease-trends/by-category')
  @ZodSerializerDto(DiseaseTrendByCategoryListResponseDto)
  getDiseaseTrendsByCategory(
    @Request() req: RequestWithUser,
    @Query() query: AnalyticsDateRangeQueryDto,
  ) {
    return this.analyticsService.getDiseaseTrendsByCategory(
      req.user!.clinicId!,
      this.parseDate(query.startDate),
      this.parseDate(query.endDate),
    );
  }

  @Get('disease-trends/time-series')
  @ZodSerializerDto(DiseaseTimeSeriesListResponseDto)
  getDiseaseTimeSeries(
    @Request() req: RequestWithUser,
    @Query() query: AnalyticsTimeSeriesQueryDto,
  ) {
    return this.analyticsService.getDiseaseTimeSeries(
      req.user!.clinicId!,
      new Date(query.startDate),
      new Date(query.endDate),
      query.groupBy ?? 'month',
    );
  }

  @Get('revenue/by-cpt')
  @ZodSerializerDto(RevenueByCptListResponseDto)
  getRevenueByCptCode(
    @Request() req: RequestWithUser,
    @Query() query: AnalyticsDateRangeQueryDto,
  ) {
    return this.analyticsService.getRevenueByCptCode(
      req.user!.clinicId!,
      this.parseDate(query.startDate),
      this.parseDate(query.endDate),
    );
  }

  @Get('revenue/by-category')
  @ZodSerializerDto(RevenueByCategoryListResponseDto)
  getRevenueByCategory(
    @Request() req: RequestWithUser,
    @Query() query: AnalyticsDateRangeQueryDto,
  ) {
    return this.analyticsService.getRevenueByCategory(
      req.user!.clinicId!,
      this.parseDate(query.startDate),
      this.parseDate(query.endDate),
    );
  }

  @Get('revenue/time-series')
  @ZodSerializerDto(RevenueTimeSeriesListResponseDto)
  getRevenueTimeSeries(
    @Request() req: RequestWithUser,
    @Query() query: AnalyticsTimeSeriesQueryDto,
  ) {
    return this.analyticsService.getRevenueTimeSeries(
      req.user!.clinicId!,
      new Date(query.startDate),
      new Date(query.endDate),
      query.groupBy ?? 'month',
    );
  }

  @Get('compliance/metrics')
  @ZodSerializerDto(CodingComplianceMetricsResponseDto)
  getCodingComplianceMetrics(
    @Request() req: RequestWithUser,
    @Query() query: AnalyticsDateRangeQueryDto,
  ) {
    return this.analyticsService.getCodingComplianceMetrics(
      req.user!.clinicId!,
      this.parseDate(query.startDate),
      this.parseDate(query.endDate),
    );
  }

  @Get('compliance/uncoded-stats')
  @ZodSerializerDto(UncodedVisitsStatsResponseDto)
  getUncodedVisitsStats(@Request() req: RequestWithUser) {
    return this.analyticsService.getUncodedVisitsStats(req.user!.clinicId!);
  }

  @Get('compliance/timeliness')
  @ZodSerializerDto(CodingTimelinessResponseDto)
  getCodingTimeliness(
    @Request() req: RequestWithUser,
    @Query() query: AnalyticsDateRangeQueryDto,
  ) {
    return this.analyticsService.getCodingTimeliness(
      req.user!.clinicId!,
      this.parseDate(query.startDate),
      this.parseDate(query.endDate),
    );
  }

  @Get('revenue-metrics')
  @ZodSerializerDto(RevenueMetricsListResponseDto)
  getRevenueMetrics(
    @Request() req: RequestWithUser,
    @Query() query: AnalyticsPeriodDateRangeQueryDto,
  ) {
    return this.analyticsService.getRevenueMetrics(
      req.user!.clinicId!,
      query.period ?? 'monthly',
      this.parseDate(query.startDate),
      this.parseDate(query.endDate),
    );
  }

  @Get('appointment-metrics')
  @ZodSerializerDto(AppointmentMetricsResponseDto)
  getAppointmentMetrics(
    @Request() req: RequestWithUser,
    @Query() query: AnalyticsPeriodDateRangeQueryDto,
  ) {
    return this.analyticsService.getAppointmentMetrics(
      req.user!.clinicId!,
      query.period ?? 'monthly',
      this.parseDate(query.startDate),
      this.parseDate(query.endDate),
    );
  }

  @Get('patient-demographics')
  @ZodSerializerDto(PatientDemographicsResponseDto)
  getPatientDemographics(
    @Request() req: RequestWithUser,
    @Query() query: AnalyticsDateRangeQueryDto,
  ) {
    return this.analyticsService.getPatientDemographics(
      req.user!.clinicId!,
      this.parseDate(query.startDate),
      this.parseDate(query.endDate),
    );
  }

  @Get('top-conditions')
  @ZodSerializerDto(TopConditionListResponseDto)
  getTopConditions(
    @Request() req: RequestWithUser,
    @Query() query: AnalyticsLimitQueryDto,
  ) {
    return this.analyticsService.getTopConditions(
      req.user!.clinicId!,
      query.limit ?? 10,
    );
  }
}
