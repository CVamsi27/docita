import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MonitoringService } from './monitoring.service';

@Injectable()
export class MetricsScheduler {
  private readonly logger = new Logger(MetricsScheduler.name);
  private isRecordingMetrics = false;

  constructor(private monitoringService: MonitoringService) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
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

  @Cron(CronExpression.EVERY_HOUR)
  async aggregateHourlyMetrics() {
    try {
      await this.monitoringService.aggregateHourlyMetrics();
      this.logger.debug('Hourly metrics aggregated');
    } catch (error) {
      this.logger.error('Failed to aggregate hourly metrics', error);
    }
  }

  @Cron('0 5 * * *')
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
