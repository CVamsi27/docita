import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MonitoringService } from './monitoring.service';
import { isCronDisabledInThisProcess } from '@/shared/schedule/cron-env';
import { CRON_SCHEDULES } from '@/shared/schedule/cron-schedules';
import { TrackHeartbeat } from '@/shared/modules/schedule/cron-heartbeat';

@Injectable()
export class MetricsScheduler {
  private readonly logger = new Logger(MetricsScheduler.name);
  private isRecordingMetrics = false;

  constructor(private monitoringService: MonitoringService) {}

  @Cron(CRON_SCHEDULES.METRICS_FLUSH, {
    disabled: isCronDisabledInThisProcess(),
  })
  @TrackHeartbeat('monitoring.metrics.system')
  async recordSystemMetrics() {
    if (this.isRecordingMetrics) {
      this.logger.debug(
        'Skipping metrics recording - previous job still running',
      );
      return;
    }

    this.isRecordingMetrics = true;
    try {
      await this.monitoringService.recordSystemMetrics();
      this.logger.debug('System metrics recorded');
    } catch (error) {
      this.logger.error('Failed to record system metrics', error);
    } finally {
      this.isRecordingMetrics = false;
    }
  }

  @Cron(CRON_SCHEDULES.METRICS_AGGREGATE, {
    disabled: isCronDisabledInThisProcess(),
  })
  @TrackHeartbeat('monitoring.metrics.aggregate-hourly')
  async aggregateHourlyMetrics() {
    try {
      await this.monitoringService.aggregateHourlyMetrics();
      this.logger.debug('Hourly metrics aggregated');
    } catch (error) {
      this.logger.error('Failed to aggregate hourly metrics', error);
    }
  }

  @Cron(CRON_SCHEDULES.METRICS_DAILY_ROLLUP, {
    disabled: isCronDisabledInThisProcess(),
  })
  @TrackHeartbeat('monitoring.metrics.daily-rollup')
  async cleanupOldData() {
    try {
      const result = await this.monitoringService.cleanupOldData(30);
      this.logger.log(
        `Cleanup completed: ${result.requestsDeleted} requests, ${result.errorsDeleted} errors, ${result.metricsDeleted} metrics deleted`,
      );
    } catch (error) {
      this.logger.error('Failed to cleanup old data', error);
    }
  }
}
