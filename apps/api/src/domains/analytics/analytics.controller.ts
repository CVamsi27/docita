import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { TierGuard } from '../../shared/modules/auth/auth/tier.guard';
import { Role } from '@workspace/db';
import { Roles } from '../../shared/modules/auth/auth/roles.decorator';
import { RequireFeature, Feature } from '../../shared/modules/auth/auth/tier.decorator';
import { RateLimit } from '../../common/interceptors/rate-limit.interceptor';
import {
  OverviewStatsResponseDto,
  RevenueTrendListResponseDto,
  PatientGrowthListResponseDto,
  AppointmentStatsResponseDto,
  TopDiagnosisListResponseDto,
  DiseaseTrendListResponseDto,
  AnyResponseDto,
} from './dto/analytics.dto';
import { ZodSerializerDto } from 'nestjs-zod';

interface AuthRequest {
  user: {
    clinicId: string;
  };
}

@Controller('analytics')
@Roles(Role.ADMIN, Role.DOCTOR, Role.ADMIN_DOCTOR)
@UseGuards(TierGuard)
@RequireFeature(Feature.BASIC_ANALYTICS)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @RateLimit({ limit: 30, window: 60000 }) // 30 analytics queries/minute
  @ZodSerializerDto(OverviewStatsResponseDto)
  getOverview(@Request() req: AuthRequest) {
    return this.analyticsService.getOverview(req.user.clinicId);
  }

  @Get('revenue')
  @ZodSerializerDto(RevenueTrendListResponseDto)
  getRevenueTrends(
    @Request() req: AuthRequest,
    @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'daily',
    @Query('days') days: string = '30',
  ) {
    return this.analyticsService.getRevenueTrends(
      req.user.clinicId,
      period,
      parseInt(days),
    );
  }

  @Get('patients')
  @ZodSerializerDto(PatientGrowthListResponseDto)
  getPatientGrowth(
    @Request() req: AuthRequest,
    @Query('days') days: string = '30',
  ) {
    return this.analyticsService.getPatientGrowth(
      req.user.clinicId,
      parseInt(days),
    );
  }

  @Get('appointments')
  @ZodSerializerDto(AppointmentStatsResponseDto)
  getAppointmentStats(@Request() req: AuthRequest) {
    return this.analyticsService.getAppointmentStats(req.user.clinicId);
  }

  @Get('top-diagnoses')
  @ZodSerializerDto(TopDiagnosisListResponseDto)
  getTopDiagnoses(
    @Request() req: AuthRequest,
    @Query('limit') limit: string = '10',
  ) {
    return this.analyticsService.getTopDiagnoses(
      req.user.clinicId,
      parseInt(limit),
    );
  }

  @Get('disease-trends')
  @ZodSerializerDto(DiseaseTrendListResponseDto)
  getDiseaseTrends(
    @Request() req: AuthRequest,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getDiseaseTrends(
      req.user.clinicId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('disease-trends/by-category')
  @ZodSerializerDto(AnyResponseDto) // Placeholder
  getDiseaseTrendsByCategory(
    @Request() req: AuthRequest,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getDiseaseTrendsByCategory(
      req.user.clinicId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('disease-trends/time-series')
  @ZodSerializerDto(AnyResponseDto) // Placeholder
  getDiseaseTimeSeries(
    @Request() req: AuthRequest,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('groupBy') groupBy: 'day' | 'week' | 'month' = 'month',
  ) {
    return this.analyticsService.getDiseaseTimeSeries(
      req.user.clinicId,
      new Date(startDate),
      new Date(endDate),
      groupBy,
    );
  }

  @Get('revenue/by-cpt')
  @ZodSerializerDto(AnyResponseDto) // Placeholder
  getRevenueByCptCode(
    @Request() req: AuthRequest,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getRevenueByCptCode(
      req.user.clinicId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('revenue/by-category')
  @ZodSerializerDto(AnyResponseDto) // Placeholder
  getRevenueByCategory(
    @Request() req: AuthRequest,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getRevenueByCategory(
      req.user.clinicId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('revenue/time-series')
  @ZodSerializerDto(AnyResponseDto) // Placeholder
  getRevenueTimeSeries(
    @Request() req: AuthRequest,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('groupBy') groupBy: 'day' | 'week' | 'month' = 'month',
  ) {
    return this.analyticsService.getRevenueTimeSeries(
      req.user.clinicId,
      new Date(startDate),
      new Date(endDate),
      groupBy,
    );
  }

  @Get('compliance/metrics')
  @ZodSerializerDto(AnyResponseDto) // Placeholder
  getCodingComplianceMetrics(
    @Request() req: AuthRequest,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getCodingComplianceMetrics(
      req.user.clinicId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('compliance/uncoded-stats')
  @ZodSerializerDto(AnyResponseDto) // Placeholder
  getUncodedVisitsStats(@Request() req: AuthRequest) {
    return this.analyticsService.getUncodedVisitsStats(req.user.clinicId);
  }

  @Get('compliance/timeliness')
  @ZodSerializerDto(AnyResponseDto) // Placeholder
  getCodingTimeliness(
    @Request() req: AuthRequest,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getCodingTimeliness(
      req.user.clinicId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  // ========== NEW ENDPOINTS FOR ADVANCED ANALYTICS (Phase 1) ==========

  @Get('revenue-metrics')
  @ZodSerializerDto(AnyResponseDto) // Placeholder
  getRevenueMetrics(
    @Request() req: AuthRequest,
    @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'monthly',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getRevenueMetrics(
      req.user.clinicId,
      period,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('appointment-metrics')
  @ZodSerializerDto(AnyResponseDto) // Placeholder
  getAppointmentMetrics(
    @Request() req: AuthRequest,
    @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'monthly',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getAppointmentMetrics(
      req.user.clinicId,
      period,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('patient-demographics')
  @ZodSerializerDto(AnyResponseDto) // Placeholder
  getPatientDemographics(
    @Request() req: AuthRequest,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getPatientDemographics(
      req.user.clinicId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('top-conditions')
  @ZodSerializerDto(AnyResponseDto) // Placeholder
  getTopConditions(
    @Request() req: AuthRequest,
    @Query('limit') limit: string = '10',
  ) {
    return this.analyticsService.getTopConditions(
      req.user.clinicId,
      parseInt(limit),
    );
  }
}
