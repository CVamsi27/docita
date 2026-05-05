import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringService } from './monitoring.service';
import { RequestLogService } from './services/request-log.service';
import { ErrorTrackingService } from './services/error-tracking.service';
import { MetricsService } from './services/metrics.service';
import { HealthCheckService } from './services/health-check.service';
import { MetricType } from '@workspace/db';

describe('MonitoringService', () => {
  let service: MonitoringService;
  let requestLogService: RequestLogService;
  let errorTrackingService: ErrorTrackingService;
  let metricsService: MetricsService;
  let healthCheckService: HealthCheckService;

  const mockRequestLogService = {
    logRequest: jest.fn(),
    getRequestStats: jest.fn(),
    cleanupOldRequests: jest.fn(),
  };

  const mockErrorTrackingService = {
    logError: jest.fn(),
    getErrorStats: jest.fn(),
    resolveError: jest.fn(),
    resolveMultipleErrors: jest.fn(),
    cleanupOldErrors: jest.fn(),
  };

  const mockMetricsService = {
    recordMetric: jest.fn(),
    recordSystemMetrics: jest.fn(),
    recordFeatureUsage: jest.fn(),
    recordCacheMetric: jest.fn(),
    recordDatabaseMetric: jest.fn(),
    getSystemMetrics: jest.fn(),
    getPerformanceMetrics: jest.fn(),
    aggregateHourlyMetrics: jest.fn(),
    getAggregatedPerformance: jest.fn(),
    recordWebVital: jest.fn(),
    getWebVitals: jest.fn(),
    getSecurityMonitoringSummary: jest.fn(),
    getQueueHealthSummary: jest.fn(),
    cleanupOldMetrics: jest.fn(),
  };

  const mockHealthCheckService = {
    getSystemHealth: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonitoringService,
        { provide: RequestLogService, useValue: mockRequestLogService },
        { provide: ErrorTrackingService, useValue: mockErrorTrackingService },
        { provide: MetricsService, useValue: mockMetricsService },
        { provide: HealthCheckService, useValue: mockHealthCheckService },
      ],
    }).compile();

    service = module.get<MonitoringService>(MonitoringService);
    requestLogService = module.get<RequestLogService>(RequestLogService);
    errorTrackingService =
      module.get<ErrorTrackingService>(ErrorTrackingService);
    metricsService = module.get<MetricsService>(MetricsService);
    healthCheckService = module.get<HealthCheckService>(HealthCheckService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Delegation Tests', () => {
    it('logRequest should delegate to RequestLogService', () => {
      const data = {
        method: 'GET',
        path: '/test',
        statusCode: 200,
        duration: 42,
      };
      service.logRequest(data);
      expect(requestLogService.logRequest).toHaveBeenCalledWith(data);
    });

    it('logError should delegate to ErrorTrackingService', () => {
      const data = { type: 'TEST', message: 'Error' };
      service.logError(data);
      expect(errorTrackingService.logError).toHaveBeenCalledWith(data);
    });

    it('getSystemHealth should delegate to HealthCheckService', async () => {
      await service.getSystemHealth();
      expect(healthCheckService.getSystemHealth).toHaveBeenCalled();
    });

    it('recordMetric should delegate to MetricsService', async () => {
      await service.recordMetric(MetricType.CPU_USAGE, 100);
      expect(metricsService.recordMetric).toHaveBeenCalledWith(
        MetricType.CPU_USAGE,
        100,
        undefined,
        undefined,
      );
    });

    it('cleanupOldData should delegate to all services', async () => {
      mockRequestLogService.cleanupOldRequests.mockResolvedValue(10);
      mockErrorTrackingService.cleanupOldErrors.mockResolvedValue(5);
      mockMetricsService.cleanupOldMetrics.mockResolvedValue(20);

      const result = await service.cleanupOldData(30);

      expect(requestLogService.cleanupOldRequests).toHaveBeenCalledWith(30);
      expect(errorTrackingService.cleanupOldErrors).toHaveBeenCalledWith(30);
      expect(metricsService.cleanupOldMetrics).toHaveBeenCalledWith(30);

      expect(result).toEqual({
        requestsDeleted: 10,
        errorsDeleted: 5,
        metricsDeleted: 20,
      });
    });

    it('getSecurityMonitoringSummary should delegate to MetricsService', async () => {
      const start = new Date('2026-01-01T00:00:00.000Z');
      const end = new Date('2026-01-02T00:00:00.000Z');
      mockMetricsService.getSecurityMonitoringSummary.mockResolvedValue({
        windowStart: start.toISOString(),
        windowEnd: end.toISOString(),
        totalRequests: 1,
        status401: 0,
        status403: 0,
        status429: 0,
        status5xx: 0,
        topAuthFailureRoutes: [],
      });

      await service.getSecurityMonitoringSummary(start, end);

      expect(metricsService.getSecurityMonitoringSummary).toHaveBeenCalledWith(
        start,
        end,
      );
    });

    it('getQueueHealthSummary should delegate to MetricsService', async () => {
      mockMetricsService.getQueueHealthSummary.mockResolvedValue({
        countsByStatus: [],
        topQueuesByWaiting: [],
        topQueuesByFailed: [],
        deadLetteredLast24h: 0,
      });

      await service.getQueueHealthSummary();

      expect(metricsService.getQueueHealthSummary).toHaveBeenCalled();
    });
  });
});
