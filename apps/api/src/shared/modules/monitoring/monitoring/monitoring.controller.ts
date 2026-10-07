import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  UseGuards,
  UsePipes,
  Inject,
} from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { MonitoringService } from './monitoring.service';
import { JwtAuthGuard as _JwtAuthGuard } from '@/shared/modules/auth/auth/jwt-auth.guard';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import { Role } from '@workspace/db';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import {
  RequireFeature,
  Feature,
} from '@/shared/modules/auth/auth/tier.decorator';
import {
  RequestStatsResponseDto,
  ErrorStatsResponseDto,
  PerformanceMetricsResponseDto,
  SystemHealthResponseDto,
  AggregatedPerformanceResponseDto,
  MonitoringDashboardResponseDto,
  WebVitalsAggregateListResponseDto,
  AnyResponseDto,
  SecurityMonitoringSummaryResponseDto,
  QueueHealthSummaryResponseDto,
  BackgroundJobsHealthSummaryResponseDto,
  TelemetryCoverageResponseDto,
} from './dto/monitoring.dto';
import { parseStringEnumMember } from '@workspace/utils';
import { RouteCategory } from '@workspace/db';
import {
  ResolveMultipleErrorsSchema,
  ResolveMultipleErrorsDto,
  ArchiveErrorsSchema,
  ArchiveErrorsDto,
} from './dto/monitoring-admin.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { ZodValidationPipe } from '@/shared/common/pipes/zod-validation.pipe';

import { ArchivalService } from '@/shared/modules/compliance/archival.service';

@Controller('monitoring')
@Roles(Role.INTERNAL)
@UseGuards(TierGuard)
@RequireFeature(Feature.BASIC_ANALYTICS)
export class MonitoringController {
  constructor(
    private readonly monitoringService: MonitoringService,
    private readonly archivalService: ArchivalService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  @Post('archive')
  @ZodSerializerDto(AnyResponseDto)
  @UsePipes(new ZodValidationPipe(ArchiveErrorsSchema))
  async manualArchive(@Body() dto: ArchiveErrorsDto) {
    const results = await Promise.all([
      this.archivalService.archiveAuditLogs(dto.auditDays),
      this.archivalService.archiveWhatsappLogs(dto.whatsappDays),
      this.archivalService.archiveAppointments(dto.appointmentYears),
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
    @Query('routeCategory') routeCategory?: string,
  ) {
    return this.monitoringService.getRequestStats(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      clinicId,
      this.toRouteCategory(routeCategory),
    );
  }

  /**
   * Narrows a query to one route family. Unknown values are ignored rather than
   * rejected so a stale dashboard cannot 500 the monitoring endpoint; the
   * unfiltered result is always a safe fallback.
   */
  private toRouteCategory(value?: string): RouteCategory | undefined {
    if (!value) {
      return undefined;
    }
    return (
      parseStringEnumMember(Object.values(RouteCategory), value) ?? undefined
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
    @Query('routeCategory') routeCategory?: string,
  ) {
    return this.monitoringService.getPerformanceMetrics(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      this.toRouteCategory(routeCategory),
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
  @ZodSerializerDto(AnyResponseDto)
  async resolveError(
    @Param('id') errorId: string,
    @Body('resolvedBy') resolvedBy: string,
  ) {
    return this.monitoringService.resolveError(errorId, resolvedBy);
  }

  @Post('errors/resolve-multiple')
  @ZodSerializerDto(AnyResponseDto)
  @UsePipes(new ZodValidationPipe(ResolveMultipleErrorsSchema))
  async resolveMultipleErrors(@Body() dto: ResolveMultipleErrorsDto) {
    return this.monitoringService.resolveMultipleErrors(
      dto.errorIds,
      dto.resolvedBy,
    );
  }

  @Post('cleanup')
  @ZodSerializerDto(AnyResponseDto)
  async cleanupOldData(@Body('daysToKeep') daysToKeep?: number) {
    return this.monitoringService.cleanupOldData(daysToKeep);
  }

  @Get('dashboard')
  @ZodSerializerDto(MonitoringDashboardResponseDto)
  async getDashboard(@Query('clinicId') clinicId?: string) {
    const now = this.clock.now();
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

  @Get('web-vitals')
  @ZodSerializerDto(WebVitalsAggregateListResponseDto)
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

  @Get('security-summary')
  @ZodSerializerDto(SecurityMonitoringSummaryResponseDto)
  async getSecuritySummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const end = endDate ? new Date(endDate) : this.clock.now();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - 24 * 60 * 60 * 1000);
    return this.monitoringService.getSecurityMonitoringSummary(start, end);
  }

  @Get('queue-health')
  @ZodSerializerDto(QueueHealthSummaryResponseDto)
  async getQueueHealth() {
    return this.monitoringService.getQueueHealthSummary();
  }

  /**
   * Cron heartbeat freshness and outbox backlog age. Both backends already
   * record this internally but nothing read it back, so a scheduler that
   * silently stopped and an outbox that stopped draining were both invisible
   * until someone read the logs.
   */
  @Get('background-jobs')
  @ZodSerializerDto(BackgroundJobsHealthSummaryResponseDto)
  async getBackgroundJobsHealth() {
    return this.monitoringService.getBackgroundJobsHealthSummary();
  }

  /**
   * What the retained telemetry window can honestly support: first/last retained
   * request instants, the customer/health-check/internal split, and every
   * recorded capture gap. Deliberately not an uptime percentage — see
   * `coverageNote` in the response.
   */
  @Get('telemetry-coverage')
  @ZodSerializerDto(TelemetryCoverageResponseDto)
  async getTelemetryCoverage(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.monitoringService.getTelemetryCoverage(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }
}
