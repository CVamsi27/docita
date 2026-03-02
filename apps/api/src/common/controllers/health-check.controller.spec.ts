import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckController } from './health-check.controller';
import { ObservabilityService } from '@/shared/modules/services/observability.service';

describe.skip('HealthCheckController', () => {
  let controller: HealthCheckController;
  let observabilityService: ObservabilityService;

  const mockObservabilityService = {
    getSystemHealth: jest.fn(),
    getDatabaseHealth: jest.fn(),
    getMetricsSummary: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthCheckController],
      providers: [
        {
          provide: ObservabilityService,
          useValue: mockObservabilityService,
        },
      ],
    }).compile();

    controller = module.get<HealthCheckController>(HealthCheckController);
    observabilityService =
      module.get<ObservabilityService>(ObservabilityService);
  });

  describe('health endpoint', () => {
    it('should always return ok status', async () => {
      const result = await controller.health();

      expect(result).toBeDefined();
      expect(result.status).toBe('ok');
    });

    it('should return ISO timestamp', async () => {
      const result = await controller.health();

      expect(result.timestamp).toBeDefined();
      const date = new Date(result.timestamp);
      expect(date.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('liveness endpoint', () => {
    it('should return liveness status', async () => {
      mockObservabilityService.getSystemHealth.mockReturnValueOnce({
        uptime: 12345,
        memory: { heapUsed: 100, heapTotal: 200, rss: 300 },
      });

      const result = await controller.liveness();

      expect(result.status).toBe('alive');
      expect(result.services).toBeDefined();
    });

    it('should include service details', async () => {
      mockObservabilityService.getSystemHealth.mockReturnValueOnce({
        uptime: 12345,
        memory: { heapUsed: 100, heapTotal: 200, rss: 300 },
      });

      const result = await controller.liveness();

      expect(result.services).toHaveProperty('api');
      expect(result.services.api).toBe('alive');
    });

    it('should include uptime information', async () => {
      const mockHealth = {
        uptime: 3600,
        memory: { heapUsed: 100, heapTotal: 200, rss: 300 },
      };
      mockObservabilityService.getSystemHealth.mockReturnValueOnce(mockHealth);

      const result = await controller.liveness();

      expect(result.uptime).toBeDefined();
      expect(typeof result.uptime).toBe('number');
    });
  });

  describe('readiness endpoint', () => {
    it('should return ready status when all dependencies are healthy', async () => {
      mockObservabilityService.getSystemHealth.mockReturnValueOnce({
        uptime: 12345,
        memory: { heapUsed: 100, heapTotal: 200, rss: 300 },
      });
      mockObservabilityService.getDatabaseHealth.mockResolvedValueOnce({
        connected: true,
        latency: 50,
      });

      const result = await controller.readiness();

      expect(result.status).toBe('ready');
      expect(result.dependencies).toBeDefined();
    });

    it('should check database connectivity', async () => {
      mockObservabilityService.getSystemHealth.mockReturnValueOnce({
        uptime: 12345,
        memory: { heapUsed: 100, heapTotal: 200, rss: 300 },
      });
      mockObservabilityService.getDatabaseHealth.mockResolvedValueOnce({
        connected: true,
        latency: 50,
      });

      const result = await controller.readiness();

      expect(result.dependencies.database).toBe('connected');
    });

    it('should report not ready if database is down', async () => {
      mockObservabilityService.getSystemHealth.mockReturnValueOnce({
        uptime: 12345,
        memory: { heapUsed: 100, heapTotal: 200, rss: 300 },
      });
      mockObservabilityService.getDatabaseHealth.mockResolvedValueOnce({
        connected: false,
        latency: null,
      });

      const result = await controller.readiness();

      expect(result.status).toBe('not_ready');
      expect(result.dependencies.database).toBe('disconnected');
    });
  });

  describe('database health endpoint', () => {
    it('should return database connection status', async () => {
      mockObservabilityService.getDatabaseHealth.mockResolvedValueOnce({
        connected: true,
        latency: 45,
      });

      const result = await controller.dbHealth();

      expect(result.status).toBeDefined();
      expect(result.connected).toBe(true);
    });

    it('should return database latency', async () => {
      mockObservabilityService.getDatabaseHealth.mockResolvedValueOnce({
        connected: true,
        latency: 75,
      });

      const result = await controller.dbHealth();

      expect(result.latency).toBe(75);
    });

    it('should handle database connection failure', async () => {
      mockObservabilityService.getDatabaseHealth.mockResolvedValueOnce({
        connected: false,
        latency: null,
      });

      const result = await controller.dbHealth();

      expect(result.connected).toBe(false);
      expect(result.status).toBe('disconnected');
    });

    it('should include timestamp', async () => {
      mockObservabilityService.getDatabaseHealth.mockResolvedValueOnce({
        connected: true,
        latency: 50,
      });

      const result = await controller.dbHealth();

      expect(result.timestamp).toBeDefined();
    });
  });

  describe('metrics endpoint', () => {
    it('should return current metrics', () => {
      const mockMetrics = [
        {
          name: 'request_latency',
          mean: 150,
          count: 100,
          min: 50,
          max: 500,
        },
        {
          name: 'db_query_time',
          mean: 100,
          count: 50,
          min: 20,
          max: 300,
        },
      ];
      mockObservabilityService.getMetricsSummary.mockReturnValueOnce(
        mockMetrics,
      );

      const result = controller.metrics();

      expect(result.metrics).toBeDefined();
      expect(result.metrics.length).toBe(2);
    });

    it('should include metric statistics', () => {
      const mockMetrics = [
        {
          name: 'request_latency',
          mean: 150,
          count: 100,
          min: 50,
          max: 500,
        },
      ];
      mockObservabilityService.getMetricsSummary.mockReturnValueOnce(
        mockMetrics,
      );

      const result = controller.metrics();

      expect(result.metrics[0]).toHaveProperty('mean');
      expect(result.metrics[0]).toHaveProperty('count');
      expect(result.metrics[0]).toHaveProperty('min');
      expect(result.metrics[0]).toHaveProperty('max');
    });

    it('should return empty metrics if none recorded', () => {
      mockObservabilityService.getMetricsSummary.mockReturnValueOnce([]);

      const result = controller.metrics();

      expect(result.metrics).toEqual([]);
    });

    it('should include timestamp and collection time', () => {
      mockObservabilityService.getMetricsSummary.mockReturnValueOnce([]);

      const result = controller.metrics();

      expect(result.timestamp).toBeDefined();
      expect(result.collectionTime).toBeDefined();
    });
  });

  describe('system health endpoint', () => {
    it('should return system health information', async () => {
      const mockHealth = {
        uptime: 3600,
        memory: {
          heapUsed: 50000000,
          heapTotal: 100000000,
          rss: 120000000,
        },
      };
      mockObservabilityService.getSystemHealth.mockReturnValueOnce(mockHealth);

      const result = await controller.systemHealth();

      expect(result.uptime).toBe(3600);
      expect(result.memory).toBeDefined();
    });

    it('should include memory statistics', async () => {
      const mockHealth = {
        uptime: 3600,
        memory: {
          heapUsed: 50000000,
          heapTotal: 100000000,
          rss: 120000000,
        },
      };
      mockObservabilityService.getSystemHealth.mockReturnValueOnce(mockHealth);

      const result = await controller.systemHealth();

      expect(result.memory.heapUsed).toBeDefined();
      expect(result.memory.heapTotal).toBeDefined();
      expect(result.memory.rss).toBeDefined();
    });

    it('should calculate memory percentage', async () => {
      const mockHealth = {
        uptime: 3600,
        memory: {
          heapUsed: 50000000,
          heapTotal: 100000000,
          rss: 120000000,
        },
      };
      mockObservabilityService.getSystemHealth.mockReturnValueOnce(mockHealth);

      const result = await controller.systemHealth();

      expect(result.memory.percentage).toBeDefined();
      expect(result.memory.percentage).toBeGreaterThan(0);
      expect(result.memory.percentage).toBeLessThanOrEqual(100);
    });

    it('should include service info', async () => {
      const mockHealth = {
        uptime: 3600,
        memory: {
          heapUsed: 50000000,
          heapTotal: 100000000,
          rss: 120000000,
        },
      };
      mockObservabilityService.getSystemHealth.mockReturnValueOnce(mockHealth);

      const result = await controller.systemHealth();

      expect(result.service).toBe('api');
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete health check flow', async () => {
      const mockHealth = {
        uptime: 12345,
        memory: { heapUsed: 100, heapTotal: 200, rss: 300 },
      };
      mockObservabilityService.getSystemHealth.mockReturnValue(mockHealth);
      mockObservabilityService.getDatabaseHealth.mockResolvedValue({
        connected: true,
        latency: 50,
      });
      mockObservabilityService.getMetricsSummary.mockReturnValue([]);

      const liveness = await controller.liveness();
      expect(liveness.status).toBe('alive');

      const readiness = await controller.readiness();
      expect(readiness.status).toBe('ready');

      const dbHealth = await controller.dbHealth();
      expect(dbHealth.connected).toBe(true);

      const systemHealth = controller.systemHealth();
      expect(systemHealth.uptime).toBe(12345);

      const metrics = controller.metrics();
      expect(metrics.metrics).toEqual([]);
    });

    it('should handle system under stress', async () => {
      const mockHealth = {
        uptime: 7200,
        memory: {
          heapUsed: 95000000,
          heapTotal: 100000000,
          rss: 120000000,
        },
      };
      mockObservabilityService.getSystemHealth.mockReturnValue(mockHealth);
      mockObservabilityService.getDatabaseHealth.mockResolvedValue({
        connected: true,
        latency: 200,
      });

      const readiness = await controller.readiness();
      expect(readiness.status).toBe('ready');

      const systemHealth = await controller.systemHealth();
      expect(systemHealth.memory.percentage).toBeGreaterThan(90);
    });

    it('should gracefully handle observability service errors', async () => {
      mockObservabilityService.getSystemHealth.mockImplementationOnce(() => {
        throw new Error('Health check failed');
      });

      const result = await controller.liveness();
      expect(result).toBeDefined();
    });
  });
});
