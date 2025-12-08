import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TierGuard } from '../auth/tier.guard';
import { RequireFeature, Feature } from '../auth/tier.decorator';

@Controller('analytics')
@UseGuards(JwtAuthGuard, TierGuard)
@RequireFeature(Feature.BASIC_ANALYTICS)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  getOverview() {
    return this.analyticsService.getOverview();
  }

  @Get('revenue')
  getRevenueTrends(
    @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'daily',
    @Query('days') days: string = '30',
  ) {
    return this.analyticsService.getRevenueTrends(period, parseInt(days));
  }

  @Get('patients')
  getPatientGrowth(@Query('days') days: string = '30') {
    return this.analyticsService.getPatientGrowth(parseInt(days));
  }

  @Get('appointments')
  getAppointmentStats() {
    return this.analyticsService.getAppointmentStats();
  }

  @Get('top-diagnoses')
  getTopDiagnoses(@Query('limit') limit: string = '10') {
    return this.analyticsService.getTopDiagnoses(parseInt(limit));
  }

  @Get('disease-trends')
  getDiseaseTrends(
    @Query('clinicId') clinicId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getDiseaseTrends(
      clinicId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('disease-trends/by-category')
  getDiseaseTrendsByCategory(
    @Query('clinicId') clinicId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getDiseaseTrendsByCategory(
      clinicId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('disease-trends/time-series')
  getDiseaseTimeSeries(
    @Query('clinicId') clinicId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('groupBy') groupBy: 'day' | 'week' | 'month' = 'month',
  ) {
    return this.analyticsService.getDiseaseTimeSeries(
      clinicId,
      new Date(startDate),
      new Date(endDate),
      groupBy,
    );
  }

  @Get('revenue/by-cpt')
  getRevenueByCptCode(
    @Query('clinicId') clinicId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getRevenueByCptCode(
      clinicId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('revenue/by-category')
  getRevenueByCategory(
    @Query('clinicId') clinicId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getRevenueByCategory(
      clinicId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('revenue/time-series')
  getRevenueTimeSeries(
    @Query('clinicId') clinicId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('groupBy') groupBy: 'day' | 'week' | 'month' = 'month',
  ) {
    return this.analyticsService.getRevenueTimeSeries(
      clinicId,
      new Date(startDate),
      new Date(endDate),
      groupBy,
    );
  }

  @Get('compliance/metrics')
  getCodingComplianceMetrics(
    @Query('clinicId') clinicId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getCodingComplianceMetrics(
      clinicId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('compliance/uncoded-stats')
  getUncodedVisitsStats(@Query('clinicId') clinicId: string) {
    return this.analyticsService.getUncodedVisitsStats(clinicId);
  }

  @Get('compliance/timeliness')
  getCodingTimeliness(
    @Query('clinicId') clinicId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getCodingTimeliness(
      clinicId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  // ========== NEW ENDPOINTS FOR ADVANCED ANALYTICS (Phase 1) ==========

  @Get('revenue-metrics')
  getRevenueMetrics(
    @Query('clinicId') clinicId: string,
    @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'monthly',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getRevenueMetrics(
      clinicId,
      period,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('appointment-metrics')
  getAppointmentMetrics(
    @Query('clinicId') clinicId: string,
    @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'monthly',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getAppointmentMetrics(
      clinicId,
      period,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('patient-demographics')
  getPatientDemographics(
    @Query('clinicId') clinicId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getPatientDemographics(
      clinicId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('top-conditions')
  getTopConditions(
    @Query('clinicId') clinicId: string,
    @Query('limit') limit: string = '10',
  ) {
    return this.analyticsService.getTopConditions(clinicId, parseInt(limit));
  }
}
