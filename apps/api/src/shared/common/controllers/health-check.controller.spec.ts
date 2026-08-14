import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { HealthCheckController } from './health-check.controller';
import { ObservabilityService } from '@/shared/modules/services/observability.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

describe('HealthCheckController', () => {
  let controller: HealthCheckController;

  const mockObservabilityService = {
    getSystemHealth: jest.fn<() => Promise<unknown>>(),
    getDatabaseHealth: jest.fn<() => Promise<unknown>>(),
    getMetricsSummary: jest.fn<() => unknown>(),
  };

  const mockConfigService = {
    getAppVersion: jest.fn(() => '1.2.3'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthCheckController],
      providers: [
        {
          provide: ObservabilityService,
          useValue: mockObservabilityService,
        },
        {
          provide: AppConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<HealthCheckController>(HealthCheckController);
    jest.clearAllMocks();
  });

  it('returns ping payload with version', () => {
    const result = controller.ping();

    expect(result.status).toBe('ok');
    expect(typeof result.timestamp).toBe('string');
    expect(result.version).toBe('1.2.3');
  });

  it('returns liveness payload', async () => {
    const result = controller.liveness();

    expect(result.status).toBe('ok');
    expect(result.service).toBe('docita-api');
    expect(typeof result.timestamp).toBe('string');
    expect(typeof result.uptime).toBe('number');
    expect(mockObservabilityService.getSystemHealth).not.toHaveBeenCalled();
  });

  it('returns readiness payload when healthy', async () => {
    mockObservabilityService.getSystemHealth.mockResolvedValueOnce({
      status: 'healthy',
      checks: { db: { connected: true } },
    });

    const result = await controller.readiness();

    expect(result.ready).toBe(true);
    expect(result.checks).toEqual({ db: { connected: true } });
    expect(typeof result.timestamp).toBe('string');
  });

  it('throws 503 when readiness is unhealthy', async () => {
    mockObservabilityService.getSystemHealth.mockResolvedValueOnce({
      status: 'unhealthy',
      checks: { database: { status: 'disconnected' } },
    });

    await expect(controller.readiness()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('returns database health from service', async () => {
    const dbHealth = { connected: true, latencyMs: 12 };
    mockObservabilityService.getDatabaseHealth.mockResolvedValueOnce(dbHealth);

    const result = await controller.databaseHealth();

    expect(result).toEqual(dbHealth);
  });

  it('returns metrics summary from service', () => {
    const metrics = { requests: 100, errors: 2 };
    mockObservabilityService.getMetricsSummary.mockReturnValueOnce(metrics);

    const result = controller.metrics();

    expect(result).toEqual(metrics);
  });

  it('returns system metrics payload', () => {
    const result = controller.systemMetrics();

    expect(typeof result.uptime).toBe('number');
    expect(result.memory).toBeDefined();
    expect(typeof result.timestamp).toBe('string');
  });
});
