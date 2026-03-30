import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringService } from './monitoring.service';
import { RequestLogService } from './services/request-log.service';
import { ErrorTrackingService } from './services/error-tracking.service';
import { MetricsService } from './services/metrics.service';
import { HealthCheckService } from './services/health-check.service';

describe('MonitoringService', () => {
  let service: MonitoringService;
  let requestLogService: RequestLogService;
  let errorTrackingService: ErrorTrackingService;
  let metricsService: MetricsService;
  let healthCheckService: HealthCheckService;

  const mockRequestLogService = {
    logRequest: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    getRequestStats: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    cleanupOldRequests: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  const mockErrorTrackingService = {
    logError: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    getErrorStats: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    resolveError: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    resolveMultipleErrors: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    cleanupOldErrors: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  const mockMetricsService = {
    recordMetric: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    recordSystemMetrics: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    recordFeatureUsage: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    recordCacheMetric: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    recordDatabaseMetric: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    getSystemMetrics: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    getPerformanceMetrics: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    aggregateHourlyMetrics: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    getAggregatedPerformance:
      jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    recordWebVital: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    getWebVitals: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    cleanupOldMetrics: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  const mockHealthCheckService = {
    getSystemHealth: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
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
      const data: Record<string, unknown> = { method: 'GET', path: '/test' };
      service.logRequest(data);
      expect(requestLogService.logRequest).toHaveBeenCalledWith(data);
    });

    it('logError should delegate to ErrorTrackingService', () => {
      const data: Record<string, unknown> = { message: 'Error' };
      service.logError(data);
      expect(errorTrackingService.logError).toHaveBeenCalledWith(data);
    });

    it('getSystemHealth should delegate to HealthCheckService', async () => {
      await service.getSystemHealth();
      expect(healthCheckService.getSystemHealth).toHaveBeenCalled();
    });

    it('recordMetric should delegate to MetricsService', async () => {
      await service.recordMetric('CPU_USAGE' as never, 100);
      expect(metricsService.recordMetric).toHaveBeenCalledWith(
        'CPU_USAGE',
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
  });
});
