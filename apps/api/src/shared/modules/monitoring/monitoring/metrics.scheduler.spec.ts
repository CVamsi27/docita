import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MonitoringService } from './monitoring.service';
import { CRON_SCHEDULES } from '@/shared/schedule/cron-schedules';
import { MetricsScheduler } from './metrics.scheduler';

describe('MetricsScheduler', () => {
  const recordSystemMetricsMock =
    jest.fn<MonitoringService['recordSystemMetrics']>();
  const aggregateHourlyMetricsMock =
    jest.fn<MonitoringService['aggregateHourlyMetrics']>();
  const cleanupOldDataMock = jest.fn<MonitoringService['cleanupOldData']>();

  const monitoringService = Object.create(
    MonitoringService.prototype,
  ) as MonitoringService;
  monitoringService.recordSystemMetrics = recordSystemMetricsMock;
  monitoringService.aggregateHourlyMetrics = aggregateHourlyMetricsMock;
  monitoringService.cleanupOldData = cleanupOldDataMock;

  const scheduler = new MetricsScheduler(monitoringService);

  beforeEach(() => {
    jest.clearAllMocks();
    recordSystemMetricsMock.mockResolvedValue();
    aggregateHourlyMetricsMock.mockResolvedValue();
    cleanupOldDataMock.mockResolvedValue({
      requestsDeleted: 10,
      errorsDeleted: 5,
      metricsDeleted: 3,
    });
  });

  it('is wired to the expected monitoring cron expressions', () => {
    expect(CRON_SCHEDULES.METRICS_FLUSH).toBe('0 */10 * * * *');
    expect(CRON_SCHEDULES.METRICS_AGGREGATE).toBe('0 0-23/1 * * *');
    expect(CRON_SCHEDULES.METRICS_DAILY_ROLLUP).toBe('0 5 * * *');
  });

  it('records system metrics when idle', async () => {
    await scheduler.recordSystemMetrics();

    expect(recordSystemMetricsMock).toHaveBeenCalledTimes(1);
  });

  it('skips a tick while the previous recording is still running', async () => {
    let releaseFirst!: () => void;
    recordSystemMetricsMock.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        releaseFirst = resolve;
      }),
    );

    const first = scheduler.recordSystemMetrics();
    await scheduler.recordSystemMetrics(); // skipped: still running
    expect(recordSystemMetricsMock).toHaveBeenCalledTimes(1);

    releaseFirst();
    await first;

    await scheduler.recordSystemMetrics();
    expect(recordSystemMetricsMock).toHaveBeenCalledTimes(2);
  });

  it('recovers from a failed metrics recording and resets the guard', async () => {
    recordSystemMetricsMock.mockRejectedValueOnce(new Error('metrics boom'));

    await expect(scheduler.recordSystemMetrics()).resolves.toBeUndefined();
    await scheduler.recordSystemMetrics();

    expect(recordSystemMetricsMock).toHaveBeenCalledTimes(2);
  });

  it('delegates hourly aggregation and the 30-day cleanup rollup', async () => {
    await scheduler.aggregateHourlyMetrics();
    await scheduler.cleanupOldData();

    expect(aggregateHourlyMetricsMock).toHaveBeenCalledTimes(1);
    expect(cleanupOldDataMock).toHaveBeenCalledWith(30);
  });
});
