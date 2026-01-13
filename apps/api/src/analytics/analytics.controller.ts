import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TierGuard } from '../auth/tier.guard';
import { RequireFeature, Feature } from '../auth/tier.decorator';

interface AuthRequest {
  user: {
    clinicId: string;
  };
}

@Controller('analytics')
@UseGuards(JwtAuthGuard, TierGuard)
@RequireFeature(Feature.BASIC_ANALYTICS)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  getOverview(@Request() req: AuthRequest) {
    return this.analyticsService.getOverview(req.user.clinicId);
  }

  @Get('revenue')
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
  getAppointmentStats(@Request() req: AuthRequest) {
    return this.analyticsService.getAppointmentStats(req.user.clinicId);
  }

  @Get('top-diagnoses')
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
  getUncodedVisitsStats(@Request() req: AuthRequest) {
    return this.analyticsService.getUncodedVisitsStats(req.user.clinicId);
  }

  @Get('compliance/timeliness')
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
