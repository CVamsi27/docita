import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as Sentry from '@sentry/nestjs';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { PrismaService } from '@/prisma/prisma.service';
import { ObservabilityService } from './observability.service';
import { createFixedClockMock } from '@/test-utils';

const consoleIntegration = { name: 'console-logging-integration' };

jest.mock('@sentry/nestjs', () => ({
  init: jest.fn(),
  consoleLoggingIntegration: jest.fn(() => consoleIntegration),
  metrics: {
    distribution: jest.fn(),
    count: jest.fn(),
    gauge: jest.fn(),
  },
  withScope: jest.fn((callback: (scope: unknown) => void) =>
    callback({
      setLevel: jest.fn(),
      setContext: jest.fn(),
    }),
  ),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  getCurrentScope: jest.fn(() => undefined),
}));

describe('ObservabilityService', () => {
  const clock = createFixedClockMock();

  const mockConfigService = {
    getSentryConfig: jest.fn(),
    getEnvironment: jest.fn(),
    getAppVersion: jest.fn(),
  };

  type MockPrismaService = PrismaService & {
    $queryRaw: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
    errorLog: {
      create: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
    };
  };

  const mockPrismaService: MockPrismaService = {
    $queryRaw: jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue([{ '?column?': 1 }]),
    errorLog: {
      create: jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue(undefined),
    },
  } as unknown as MockPrismaService;
  let service: ObservabilityService | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    service = null;
    mockConfigService.getSentryConfig.mockReturnValue({
      dsn: 'https://examplePublicKey@o0.ingest.sentry.io/0',
      tracesSampleRate: 0.2,
      profilesSampleRate: 0.1,
    });
    mockConfigService.getEnvironment.mockReturnValue('production');
    mockConfigService.getAppVersion.mockReturnValue('1.2.3');
  });

  afterEach(() => {
    service?.onModuleDestroy();
    service = null;
  });

  it('initializes Sentry with privacy callbacks for transactions and structured logs', async () => {
    service = new ObservabilityService(
      mockPrismaService,
      mockConfigService as unknown as AppConfigService,
      clock,
    );

    service.initializeSentry();

    expect(Sentry.consoleLoggingIntegration).toHaveBeenCalledWith({
      levels: ['log', 'warn', 'error'],
    });
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://examplePublicKey@o0.ingest.sentry.io/0',
        environment: 'production',
        enableLogs: true,
        beforeSend: expect.any(Function),
        integrations: [consoleIntegration],
        initialScope: {
          tags: {
            service: 'docita-api',
            version: '1.2.3',
          },
        },
      }),
    );
    const options = jest.mocked(Sentry.init).mock.calls[0]?.[0];
    const canary = 'synthetic-capability-canary';
    const transaction: Parameters<
      NonNullable<Sentry.NodeOptions['beforeSendTransaction']>
    >[0] = {
      type: 'transaction',
      request: { url: `/upload-signature/${canary}` },
      spans: [
        {
          span_id: '1111111111111111',
          trace_id: '11111111111111111111111111111111',
          start_timestamp: 1,
          data: {},
          op: 'http.client',
          description: `GET /reset-password?token=${canary}`,
        },
      ],
    };
    const log: Parameters<NonNullable<Sentry.NodeOptions['beforeSendLog']>>[0] =
      {
        level: 'info',
        message: `GET /upload-signature/${canary}`,
        attributes: { url: `/reset-password?token=${canary}` },
      };
    const sentTransaction = options?.beforeSendTransaction
      ? await options.beforeSendTransaction(transaction, {})
      : transaction;
    const sentLog = options?.beforeSendLog ? options.beforeSendLog(log) : log;
    expect(JSON.stringify({ sentTransaction, sentLog })).not.toContain(canary);
  });

  it('emits Sentry metrics for latency and heartbeat events', () => {
    service = new ObservabilityService(
      mockPrismaService,
      mockConfigService as unknown as AppConfigService,
      clock,
    );

    service.recordRequestLatency('/patients', 'GET', 200, 123);
    service.recordDatabaseQueryDuration('findMany', 45, true);
    service.sendHeartbeat();

    expect(Sentry.metrics.distribution).toHaveBeenCalledWith(
      'http_request_duration_ms',
      123,
    );
    expect(Sentry.metrics.distribution).toHaveBeenCalledWith(
      'db_query_duration_ms',
      45,
    );
    expect(Sentry.metrics.count).toHaveBeenCalledWith('docita_heartbeat', 1);
  });

  it('preserves caller-provided integrations while keeping log capture enabled', () => {
    const customIntegration = { name: 'custom-integration' };
    service = new ObservabilityService(
      mockPrismaService,
      mockConfigService as unknown as AppConfigService,
      clock,
    );

    service.initializeSentry({
      integrations: [customIntegration],
      tracesSampleRate: 0.5,
    });

    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        enableLogs: true,
        beforeSend: expect.any(Function),
        tracesSampleRate: 0.5,
        integrations: [consoleIntegration, customIntegration],
      }),
    );
  });

  it('captures structured warnings in Sentry by default', () => {
    service = new ObservabilityService(
      mockPrismaService,
      mockConfigService as unknown as AppConfigService,
      clock,
    );

    service.logStructured('warn', 'Failed login attempt recorded', {
      userId: 'user-123',
    });

    expect(mockPrismaService.errorLog.create).toHaveBeenCalled();
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      'Failed login attempt recorded',
    );
  });

  it('can skip Sentry capture for noisy structured warnings', () => {
    service = new ObservabilityService(
      mockPrismaService,
      mockConfigService as unknown as AppConfigService,
      clock,
    );

    service.logStructured(
      'warn',
      'Failed login attempt recorded',
      {
        userId: 'user-123',
      },
      { captureInSentry: false },
    );

    expect(mockPrismaService.errorLog.create).toHaveBeenCalled();
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it('returns database connectivity without exposing aggregate record counts', async () => {
    service = new ObservabilityService(
      mockPrismaService,
      mockConfigService as unknown as AppConfigService,
      clock,
    );

    const result = await service.getDatabaseHealth();

    expect(mockPrismaService.$queryRaw).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      status: 'connected',
      checked_at: clock.now(),
    });
    expect(result).not.toHaveProperty('stats');
  });
});
