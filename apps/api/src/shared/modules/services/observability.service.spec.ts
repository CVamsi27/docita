import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as Sentry from '@sentry/nestjs';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { PrismaService } from '@/prisma/prisma.service';
import { ObservabilityService } from './observability.service';

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
  const mockConfigService = {
    getSentryConfig: jest.fn(),
    getEnvironment: jest.fn(),
    getAppVersion: jest.fn(),
  };

  type MockPrismaService = PrismaService & {
    errorLog: {
      create: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
    };
  };

  const mockPrismaService: MockPrismaService = {
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

  it('enables Sentry logs when initializing', () => {
    service = new ObservabilityService(
      mockPrismaService,
      mockConfigService as unknown as AppConfigService,
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
        integrations: [consoleIntegration],
        initialScope: {
          tags: {
            service: 'docita-api',
            version: '1.2.3',
          },
        },
      }),
    );
  });

  it('emits Sentry metrics for latency and heartbeat events', () => {
    service = new ObservabilityService(
      mockPrismaService,
      mockConfigService as unknown as AppConfigService,
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
    );

    service.initializeSentry({
      integrations: [customIntegration],
      tracesSampleRate: 0.5,
    });

    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        enableLogs: true,
        tracesSampleRate: 0.5,
        integrations: [consoleIntegration, customIntegration],
      }),
    );
  });

  it('captures structured warnings in Sentry by default', () => {
    service = new ObservabilityService(
      mockPrismaService,
      mockConfigService as unknown as AppConfigService,
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
});
