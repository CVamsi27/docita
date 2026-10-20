import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { DatabaseOperationsController } from './database-operations.controller';
import { DatabaseBackupService } from '@/shared/modules/database/database-backup.service';
import { SlowQueryLoggingService } from '@/shared/modules/database/slow-query-logging.service';
import { DatabaseIndexOptimizationService } from '@/shared/modules/database/database-index-optimization.service';
import { DatabasePoolingService } from '@/shared/modules/database/database-pooling.service';
import { PoolSaturationHistoryService } from '@/shared/modules/database/pool-saturation-history.service';
import { PrismaService } from '@/prisma/prisma.service';
import { CLOCK_PORT } from '@/shared/common/ports/clock.port';
import { RolesGuard } from '@/shared/modules/auth/auth/roles.guard';
import type { PoolSaturationSnapshot } from '@workspace/db';

/**
 * `/status` used to report `poolConfig` from `DatabasePoolingService`, a
 * computed `cpuCount * 5 + 10` suggestion that nothing applies — the real pool
 * is capped by `DATABASE_CONSTANTS.POOL_MAX_*`. These pin the replacement: live
 * counters from the pool the API actually connects through.
 */
describe('DatabaseOperationsController pool reporting', () => {
  let controller: DatabaseOperationsController;

  const mockPrisma = {
    getPoolSaturation: jest.fn<() => PoolSaturationSnapshot>(),
  };

  const mockPoolHistory = {
    getHistory: jest.fn(() => ({ sampleCount: 7, windowMs: 180_000 })),
    clearHistory: jest.fn(),
  };

  const idle: PoolSaturationSnapshot = {
    max: 15,
    total: 4,
    idle: 4,
    waiting: 0,
    saturated: false,
    queuedForMs: null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DatabaseOperationsController],
      providers: [
        {
          provide: DatabaseBackupService,
          useValue: { getAvailableBackups: jest.fn(() => []) },
        },
        {
          provide: SlowQueryLoggingService,
          useValue: { getSlowQueryStats: jest.fn(() => ({ totalCount: 0 })) },
        },
        { provide: DatabaseIndexOptimizationService, useValue: {} },
        {
          provide: DatabasePoolingService,
          useValue: {
            logPoolConfig: jest.fn(),
            getOptimalPoolConfig: jest.fn(() => ({
              min: 10,
              max: 20,
              idleTimeoutMillis: 300_000,
              connectionTimeoutMillis: 10_000,
              maxUses: 7500,
              reapIntervalMillis: 60_000,
            })),
          },
        },
        {
          provide: PoolSaturationHistoryService,
          useValue: mockPoolHistory,
        },
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: CLOCK_PORT,
          useValue: { now: () => new Date('2026-10-05T00:00:00.000Z') },
        },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(DatabaseOperationsController);
  });

  it('reports the live pool saturation', () => {
    mockPrisma.getPoolSaturation.mockReturnValue(idle);

    expect(controller.getPoolSaturation()).toEqual(idle);
  });

  it('exposes live pool counters on /status and never the unused suggestion', () => {
    mockPrisma.getPoolSaturation.mockReturnValue(idle);

    const status = controller.getStatus();

    expect(status.poolSaturation).toEqual(idle);
    expect(status).not.toHaveProperty('poolConfig');
  });

  it('reports degraded while callers queue for a connection', () => {
    mockPrisma.getPoolSaturation.mockReturnValue({
      max: 15,
      total: 15,
      idle: 0,
      waiting: 6,
      saturated: true,
      queuedForMs: 812,
    });

    const status = controller.getStatus();

    expect(status.status).toBe('degraded');
    expect(status.poolSaturation.queuedForMs).toBe(812);
  });

  it('reports operational on an unsaturated pool', () => {
    mockPrisma.getPoolSaturation.mockReturnValue(idle);

    expect(controller.getStatus().status).toBe('operational');
  });

  it('labels the computed pool sizing advisory and points at the live pool', () => {
    const response = controller.getPoolConfig();

    // The computed suggestion must never read as authoritative: the running
    // client is capped by DATABASE_CONSTANTS, not by `cpuCount * 5 + 10`.
    expect(response.authoritative).toBe(false);
    expect(response.appliesToRunningClient).toBe(false);
    expect(response.liveEndpoint).toBe(
      '/operations/database/pooling/saturation',
    );
    expect(response.config.max).toBe(20);
  });

  it('serves the saturation history window alongside the live reading', () => {
    expect(controller.getPoolSaturationHistory()).toEqual({
      sampleCount: 7,
      windowMs: 180_000,
    });
  });

  it('clears the saturation history window', () => {
    expect(controller.clearPoolSaturationHistory()).toMatchObject({
      success: true,
    });
    expect(mockPoolHistory.clearHistory).toHaveBeenCalledTimes(1);
  });
});
