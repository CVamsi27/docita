import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@workspace/db';
import { ErrorTrackingService } from './error-tracking.service';
import { PrismaService } from '@/prisma/prisma.service';
import { TelemetryCaptureRecorder } from '@/shared/modules/monitoring/monitoring/services/telemetry-capture-recorder.service';
import { createTelemetryCaptureRecorderStub } from '@/test-utils/telemetry-capture-recorder.mock';
import type { TelemetryCaptureRecorderStub } from '@/test-utils/telemetry-capture-recorder.mock';
import { MonitoringFactory } from '@/shared/modules/monitoring/monitoring/factories/monitoring.factory';
import { ErrorLogInput } from '@/shared/modules/monitoring/monitoring/schemas/monitoring.schema';
import {
  beforeEach,
  afterEach,
  describe,
  it,
  expect,
  jest,
} from '@jest/globals';
import { clockPortTestProvider } from '@/test-utils';

describe('ErrorTrackingService', () => {
  let service: ErrorTrackingService;
  let captureRecorder: TelemetryCaptureRecorderStub;
  let prismaService: {
    errorLog: {
      createMany: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
      count: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
      groupBy: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
      findMany: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
      update: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
      updateMany: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
      deleteMany: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
    };
  };

  const mockPrismaService = {
    errorLog: {
      createMany: jest.fn(),
      count: jest.fn().mockImplementation(async () => 0),
      groupBy: jest.fn().mockImplementation(async () => []),
      findMany: jest.fn().mockImplementation(async () => []),
      update: jest.fn().mockImplementation(async () => ({})),
      updateMany: jest.fn().mockImplementation(async () => ({ count: 0 })),
      deleteMany: jest.fn().mockImplementation(async () => ({ count: 0 })),
    },
  };

  const mockMonitoringFactory = {
    createErrorLog: jest.fn((data) => data),
  };

  const sampleError: ErrorLogInput = {
    type: 'UnhandledError',
    message: 'boom',
    path: '/api/test',
    method: 'GET',
    statusCode: 500,
  };

  beforeEach(async () => {
    // Reset the source mock, not the module-scoped alias: several tests swap
    // createMany for a rejecting implementation.
    mockPrismaService.errorLog.createMany = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ErrorTrackingService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MonitoringFactory, useValue: mockMonitoringFactory },
        {
          provide: TelemetryCaptureRecorder,
          useValue: createTelemetryCaptureRecorderStub(),
        },
        clockPortTestProvider(),
      ],
    }).compile();

    service = module.get<ErrorTrackingService>(ErrorTrackingService);
    prismaService = module.get<typeof prismaService>(PrismaService);
    captureRecorder = module.get(TelemetryCaptureRecorder) as never;
  });

  afterEach(() => {
    jest.clearAllMocks();
    if (service['flushTimer']) {
      clearInterval(service['flushTimer']);
    }
  });

  it('writes sanitized JSON payloads', async () => {
    const circular: Record<string, unknown> = { nested: { count: 1 } };
    circular.self = circular;

    service.logError({
      ...sampleError,
      requestBody: {
        amount: BigInt(99),
        circular,
      },
      metadata: {
        extra: { value: BigInt(42) },
      },
    });

    await service.flushBuffer();

    expect(prismaService.errorLog.createMany).toHaveBeenCalledTimes(1);
    const createManyFirstCall = prismaService.errorLog.createMany.mock
      .calls[0]?.[0] as
      | {
          data?: Array<{
            requestBody?: {
              amount?: string;
              circular?: { self?: unknown };
            };
            metadata?: { extra?: { value?: string } };
          }>;
        }
      | undefined;
    const payload = createManyFirstCall?.data?.[0];
    expect(payload).toBeDefined();
    expect(payload?.requestBody).toBeDefined();
    expect(payload?.metadata).toBeDefined();
    expect(payload!.requestBody!.amount).toBe('99');
    expect(payload!.requestBody!.circular!.self).toBe('[Circular]');
    expect(payload!.metadata!.extra!.value).toBe('42');
  });

  it('continues buffering when database write fails', async () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError(
      'The table `public.ErrorLog` does not exist in the current database.',
      { code: 'P2021', clientVersion: 'test' },
    );

    prismaService.errorLog.createMany.mockImplementationOnce(async () =>
      Promise.reject(prismaError),
    );

    service.logError(sampleError);
    await service.flushBuffer();

    expect(prismaService.errorLog.createMany).toHaveBeenCalledTimes(1);
    // The table is genuinely missing, so the buffer is released and the loss is
    // recorded rather than retried forever.
    expect(service['errorBuffer']).toHaveLength(0);
    expect(captureRecorder.recordDisabled).toHaveBeenCalledWith(
      'MISSING_MONITORING_TABLES',
      1,
      0,
    );

    service.logError(sampleError);
    expect(service['errorBuffer']).toHaveLength(0);
    // Counted as a drop, not silently accepted.
    expect(service.getDroppedErrorCount()).toBe(2);
  });

  /**
   * The defect this closes: flushBuffer spliced the batch before writing, so one
   * transient failure permanently discarded up to 100 error rows with no trace.
   */
  it('retains the batch on a transient write failure', async () => {
    prismaService.errorLog.createMany.mockImplementationOnce(async () =>
      Promise.reject(new Error('deadlock detected')),
    );

    service.logError(sampleError);
    await service.flushBuffer();

    expect(service['errorBuffer']).toHaveLength(1);
    expect(service['persistenceDisabled']).toBe(false);
    expect(captureRecorder.recordDisabled).not.toHaveBeenCalled();
  });

  it('persists the correlation id that joins the error to its request row', async () => {
    service.logError({
      type: 'InternalServerError',
      message: 'boom',
      correlationId: 'corr-12345678',
    });

    await service.flushBuffer();

    const { data } = prismaService.errorLog.createMany.mock.calls[0]?.[0] as {
      data: Array<{ correlationId: string | null }>;
    };
    expect(data[0]?.correlationId).toBe('corr-12345678');
  });

  it('stores a null correlation id when there is no request to join to', async () => {
    service.logError({ type: 'SchedulerError', message: 'tick failed' });

    await service.flushBuffer();

    const { data } = prismaService.errorLog.createMany.mock.calls[0]?.[0] as {
      data: Array<{ correlationId: string | null }>;
    };
    expect(data[0]?.correlationId).toBeNull();
  });

  it('flushes capture events retained while the database was unavailable', async () => {
    service.logError(sampleError);

    await service.flushBuffer();

    expect(captureRecorder.flushPending).toHaveBeenCalled();
  });
});
