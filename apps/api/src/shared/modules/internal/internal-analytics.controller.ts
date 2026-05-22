import { Controller, Get, Query } from '@nestjs/common';
import { ZodSerializerDto } from 'nestjs-zod';
import { InternalAnalyticsService } from './internal-analytics.service';
import {
  InternalAnalyticsResponseDto,
  InternalPerformanceMetricsResponseDto,
} from './dto/internal.dto';
import { InternalApiAccess } from './internal.controller.access';

@Controller('internal')
@InternalApiAccess()
export class InternalAnalyticsController {
  constructor(private readonly analyticsService: InternalAnalyticsService) {}

  @Get('stats')
  async getGlobalStats() {
    return this.analyticsService.getGlobalStats();
  }

  @Get('analytics')
  @ZodSerializerDto(InternalAnalyticsResponseDto)
  async getAnalytics(
    @Query('period') period?: 'daily' | 'weekly' | 'monthly' | 'yearly',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getAnalytics(
      period || 'monthly',
      startDate,
      endDate,
    );
  }

  @Get('performance')
  @ZodSerializerDto(InternalPerformanceMetricsResponseDto)
  async getPerformanceMetrics() {
    return this.analyticsService.getPerformanceMetrics();
  }

  @Get('usage-metrics')
  async getUsageMetrics() {
    return this.analyticsService.getUsageMetrics();
  }

  @Get('tier-distribution')
  async getTierDistribution() {
    return this.analyticsService.getTierDistribution();
  }
}
