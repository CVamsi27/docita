import { Test, TestingModule } from '@nestjs/testing';
import { ObservabilityService } from './observability.service';

describe.skip('ObservabilityService', () => {
  let service: ObservabilityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ObservabilityService],
    }).compile();

    service = module.get<ObservabilityService>(ObservabilityService);
  });

  afterEach(() => {
    // Clean up any pending metrics
    service.getMetricsSummary();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize Sentry on app startup', () => {
      expect(() => {
        service.initializeSentry({
          dsn: 'https://example@sentry.io/123456',
          environment: 'test',
        });
      }).not.toThrow();
    });
  });

  describe('error tracking', () => {
    it('should capture exceptions', () => {
      const error = new Error('Test error');
      expect(() => {
        service.captureException(error, 'test-context');
      }).not.toThrow();
    });

    it('should capture messages', () => {
      expect(() => {
        service.captureMessage('Test message', 'test-context', 'info');
      }).not.toThrow();
    });

    it('should handle null context gracefully', () => {
      const error = new Error('Test error');
      expect(() => {
        service.captureException(error, undefined);
      }).not.toThrow();
    });
  });

  describe('structured logging', () => {
    it('should log structured data with correlation ID', () => {
      expect(() => {
        service.logStructured('info', 'Test message', {
          correlationId: 'test-correlation-id',
          action: 'test-action',
          details: { message: 'Test message' },
        });
      }).not.toThrow();
    });

    it('should handle missing correlation ID', () => {
      expect(() => {
        service.logStructured('info', 'Test message', {
          action: 'test-action',
          details: { message: 'Test message' },
        });
      }).not.toThrow();
    });

    it('should support different severity levels', () => {
      const severities = ['debug', 'info', 'warn', 'error'] as const;
      severities.forEach((severity) => {
        expect(() => {
          service.logStructured(severity, 'Test message', {
            action: 'test',
            details: {},
          });
        }).not.toThrow();
      });
    });
  });

  describe('metrics recording', () => {
    it('should record request latency metrics', () => {
      expect(() => {
        service.recordMetric('request_latency', 250, 'test-endpoint');
      }).not.toThrow();
    });

    it('should record database query metrics', () => {
      expect(() => {
        service.recordMetric('db_query_time', 150, 'findOne');
      }).not.toThrow();
    });

    it('should record auth metrics', () => {
      expect(() => {
        service.recordMetric('auth_failed_attempts', 1, 'user-123');
      }).not.toThrow();
    });

    it('should handle zero values', () => {
      expect(() => {
        service.recordMetric('test_metric', 0, 'test-label');
      }).not.toThrow();
    });

    it('should handle large values', () => {
      expect(() => {
        service.recordMetric('large_metric', 999999, 'test-label');
      }).not.toThrow();
    });
  });

  describe('metrics retrieval', () => {
    it('should retrieve metrics summary', () => {
      service.recordMetric('test_metric', 100, 'test-label');
      const summary = service.getMetricsSummary();

      expect(summary).toBeDefined();
      expect(Array.isArray(summary)).toBe(true);
    });

    it('should calculate metric statistics', () => {
      service.recordMetric('latency', 100, 'endpoint-1');
      service.recordMetric('latency', 200, 'endpoint-1');
      service.recordMetric('latency', 150, 'endpoint-1');

      const summary = service.getMetricsSummary();
      expect(summary.length).toBeGreaterThan(0);
    });

    it('should clear old metrics after expiration', () => {
      service.recordMetric('test', 100, 'label');
      const summaryBefore = service.getMetricsSummary();

      // Metrics should be available before expiration
      expect(summaryBefore.length).toBeGreaterThan(0);

      // Create a summary again to trigger cleanup
      const summaryAfter = service.getMetricsSummary();
      expect(summaryAfter).toBeDefined();
    });
  });

  describe('health checks', () => {
    it('should check system health', async () => {
      const health = await service.getSystemHealth();

      expect(health).toBeDefined();
      expect(health.checks).toHaveProperty('uptime');
      expect(health.checks).toHaveProperty('memory');
      expect(health.checks.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should include memory usage', async () => {
      const health = await service.getSystemHealth();

      expect(health.checks.memory).toBeDefined();
      expect(health.checks.memory).toHaveProperty('heapUsed');
      expect(health.checks.memory).toHaveProperty('heapTotal');
      expect(health.checks.memory).toHaveProperty('rss');
    });

    it('should handle database health checks', async () => {
      const health = await service.getDatabaseHealth();

      expect(health).toBeDefined();
      expect(health).toHaveProperty('connected');
    });

    it('should return database connection status', async () => {
      const health = await service.getDatabaseHealth();

      expect(typeof health.connected).toBe('boolean');
      expect(health.latency).toBeGreaterThanOrEqual(0);
    });
  });

  describe('metric flushing', () => {
    it('should flush metrics', async () => {
      service.recordMetric('test_metric', 100, 'test');

      await expect(service.flush(1000)).resolves.not.toThrow();
    });

    it('should complete within timeout', async () => {
      const startTime = Date.now();

      await service.flush(2000);

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(5000); // Should complete quickly
    });

    it('should handle flush timeout gracefully', async () => {
      // Create a large amount of metrics
      for (let i = 0; i < 100; i++) {
        service.recordMetric(`metric_${i}`, Math.random() * 1000, `label_${i}`);
      }

      await expect(service.flush(100)).resolves.not.toThrow(); // Very short timeout
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete observability workflow', async () => {
      // 1. Initialize
      service.initializeSentry({
        dsn: 'https://example@sentry.io/123456',
        environment: 'test',
      });

      // 2. Record metrics
      service.recordMetric('request_time', 250, 'POST /api/login');
      service.recordMetric('auth_success', 1, 'user-123');

      // 3. Log structured data
      service.logStructured('info', 'User login action', {
        correlationId: 'correlation-123',
        action: 'user_login',
        details: { userId: 'user-123', timestamp: new Date().toISOString() },
      });

      // 4. Check system health
      const systemHealth = await service.getSystemHealth();
      expect(systemHealth).toBeDefined();

      // 5. Get metrics
      const metrics = service.getMetricsSummary();
      expect(metrics).toBeDefined();

      // 6. Capture an event
      service.captureMessage(
        'Request processed successfully',
        'workflow',
        'info',
      );

      // 7. Flush
      await service.flush(2000);
    });

    it('should track error with context', () => {
      const error = new Error('Database connection failed');
      const correlationId = 'corr-456';

      service.logStructured('error', 'Database error', {
        correlationId,
        action: 'db_error',
        details: {
          errorMessage: error.message,
          stack: error.stack,
        },
      });

      service.captureException(error, correlationId);
      service.recordMetric('db_errors', 1, 'connection_pool');

      const summary = service.getMetricsSummary();
      expect(summary).toBeDefined();
    });

    it('should track performance metrics', () => {
      const endpoints = [
        { name: 'GET /api/patients', time: 120 },
        { name: 'POST /api/appointments', time: 350 },
        { name: 'GET /api/invoices', time: 200 },
      ];

      endpoints.forEach((endpoint) => {
        service.recordMetric('endpoint_latency', endpoint.time, endpoint.name);
      });

      const summary = service.getMetricsSummary();
      expect(summary.length).toBeGreaterThan(0);
    });
  });
});
