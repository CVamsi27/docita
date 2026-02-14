import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TierGuard } from '../auth/tier.guard';
import { Role } from '@workspace/db';
import { Roles } from '../auth/roles.decorator';
import { RequireFeature, Feature } from '../auth/tier.decorator';
import {
  WebVitalDto,
  RequestStatsResponseDto,
  ErrorStatsResponseDto,
  PerformanceMetricsResponseDto,
  SystemHealthResponseDto,
  AggregatedPerformanceResponseDto,
  MonitoringDashboardResponseDto,
  WebVitalListResponseDto,
  AnyResponseDto,
  WebVitalSchema,
} from './dto/monitoring.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

import { ArchivalService } from '../compliance/archival.service';

@Controller('monitoring')
@Roles(Role.ADMIN)
@UseGuards(TierGuard)
@RequireFeature(Feature.BASIC_ANALYTICS)
export class MonitoringController {
  constructor(
    private readonly monitoringService: MonitoringService,
    private readonly archivalService: ArchivalService,
  ) {}

  @Post('archive')
  @ZodSerializerDto(AnyResponseDto)
  async manualArchive(
    @Body('auditDays') auditDays = 90,
    @Body('whatsappDays') whatsappDays = 180,
    @Body('appointmentYears') appointmentYears = 2,
  ) {
    const results = await Promise.all([
      this.archivalService.archiveAuditLogs(auditDays),
      this.archivalService.archiveWhatsappLogs(whatsappDays),
      this.archivalService.archiveAppointments(appointmentYears),
    ]);

    return {
      auditLogsArchived: results[0],
      whatsappLogsArchived: results[1],
      appointmentsArchived: results[2],
    };
  }

  @Get('requests')
  @ZodSerializerDto(RequestStatsResponseDto)
  async getRequestStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('clinicId') clinicId?: string,
  ) {
    return this.monitoringService.getRequestStats(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      clinicId,
    );
  }

  @Get('errors')
  @ZodSerializerDto(ErrorStatsResponseDto)
  async getErrorStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('clinicId') clinicId?: string,
  ) {
    return this.monitoringService.getErrorStats(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      clinicId,
    );
  }

  @Get('performance')
  @ZodSerializerDto(PerformanceMetricsResponseDto)
  async getPerformanceMetrics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.monitoringService.getPerformanceMetrics(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('health')
  @ZodSerializerDto(SystemHealthResponseDto)
  async getSystemHealth() {
    return this.monitoringService.getSystemHealth();
  }

  @Get('aggregated')
  @ZodSerializerDto(AggregatedPerformanceResponseDto)
  async getAggregatedPerformance(
    @Query('period') period: 'hourly' | 'daily' = 'hourly',
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.monitoringService.getAggregatedPerformance(
      period,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Post('errors/:id/resolve')
  @ZodSerializerDto(AnyResponseDto) // Placeholder
  async resolveError(
    @Param('id') errorId: string,
    @Body('resolvedBy') resolvedBy: string,
  ) {
    return this.monitoringService.resolveError(errorId, resolvedBy);
  }

  @Post('errors/resolve-multiple')
  @ZodSerializerDto(AnyResponseDto) // Placeholder
  async resolveMultipleErrors(
    @Body('errorIds') errorIds: string[],
    @Body('resolvedBy') resolvedBy: string,
  ) {
    return this.monitoringService.resolveMultipleErrors(errorIds, resolvedBy);
  }

  @Post('cleanup')
  @ZodSerializerDto(AnyResponseDto) // Placeholder
  async cleanupOldData(@Body('daysToKeep') daysToKeep?: number) {
    return this.monitoringService.cleanupOldData(daysToKeep);
  }

  @Get('dashboard')
  @ZodSerializerDto(MonitoringDashboardResponseDto)
  async getDashboard(@Query('clinicId') clinicId?: string) {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [health, requestStats24h, errorStats24h, performance7d] =
      await Promise.all([
        this.monitoringService.getSystemHealth(),
        this.monitoringService.getRequestStats(oneDayAgo, now, clinicId),
        this.monitoringService.getErrorStats(oneDayAgo, now, clinicId),
        this.monitoringService.getPerformanceMetrics(sevenDaysAgo, now),
      ]);

    return {
      health,
      last24Hours: {
        requests: requestStats24h,
        errors: errorStats24h,
      },
      last7Days: {
        performance: performance7d,
      },
    };
  }

  /**
   * Web Vitals endpoint for Core Web Vitals tracking
   * ✅ OPTIMIZATION: Track real user performance metrics from frontend
   *
   * Metrics tracked:
   * - LCP (Largest Contentful Paint): < 2.5s good
   * - FID (First Input Delay): < 100ms good
   * - CLS (Cumulative Layout Shift): < 0.1 good
   * - FCP (First Contentful Paint): < 1.8s good
   * - TTFB (Time to First Byte): < 800ms good
   * - INP (Interaction to Next Paint): < 200ms good
   */
  @Post('web-vitals')
  @ZodSerializerDto(AnyResponseDto) // Returns void/status
  @UsePipes(new ZodValidationPipe(WebVitalSchema))
  async reportWebVital(@Body() vital: WebVitalDto) {
    return this.monitoringService.recordWebVital(vital);
  }

  @Get('web-vitals')
  @ZodSerializerDto(WebVitalListResponseDto)
  async getWebVitals(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
  ) {
    return this.monitoringService.getWebVitals(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      page,
    );
  }
}
