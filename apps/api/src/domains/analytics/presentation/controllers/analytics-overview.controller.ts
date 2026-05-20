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
import { RateLimit } from '@/shared/common/interceptors/rate-limit.interceptor';
import {
  AnalyticsDateRangeQueryDto,
  AnalyticsDaysQueryDto,
  AnalyticsLimitQueryDto,
  AnalyticsPeriodDaysQueryDto,
  OverviewStatsResponseDto,
  RevenueTrendListResponseDto,
  PatientGrowthListResponseDto,
  AppointmentStatsResponseDto,
  TopDiagnosisListResponseDto,
  DiseaseTrendListResponseDto,
  DiseaseTrendByCategoryListResponseDto,
  TopConditionListResponseDto,
} from '@/domains/analytics/dto/analytics.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { parseAnalyticsDate } from '@/domains/analytics/presentation/controllers/analytics-controller.helpers';

@Controller('analytics')
@Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_ANALYTICS))
@UseGuards(TierGuard)
@RequireFeature(requireFeatureForTarget(APP_ACCESS_TARGETS.API_ANALYTICS))
export class AnalyticsOverviewController {
  constructor(private readonly analyticsService: AnalyticsService) {}

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
  @RequireFeature(Feature.ADVANCED_ANALYTICS)
  @ZodSerializerDto(DiseaseTrendListResponseDto)
  getDiseaseTrends(
    @Request() req: RequestWithUser,
    @Query() query: AnalyticsDateRangeQueryDto,
  ) {
    return this.analyticsService.getDiseaseTrends(
      req.user!.clinicId!,
      parseAnalyticsDate(query.startDate),
      parseAnalyticsDate(query.endDate),
    );
  }

  @Get('disease-trends/by-category')
  @RequireFeature(Feature.ADVANCED_ANALYTICS)
  @ZodSerializerDto(DiseaseTrendByCategoryListResponseDto)
  getDiseaseTrendsByCategory(
    @Request() req: RequestWithUser,
    @Query() query: AnalyticsDateRangeQueryDto,
  ) {
    return this.analyticsService.getDiseaseTrendsByCategory(
      req.user!.clinicId!,
      parseAnalyticsDate(query.startDate),
      parseAnalyticsDate(query.endDate),
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
