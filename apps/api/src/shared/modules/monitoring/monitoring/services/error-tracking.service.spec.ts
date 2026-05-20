import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@workspace/db';
import { ErrorTrackingService } from './error-tracking.service';
import { PrismaService } from '@/prisma/prisma.service';
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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ErrorTrackingService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MonitoringFactory, useValue: mockMonitoringFactory },
        clockPortTestProvider(),
      ],
    }).compile();

    service = module.get<ErrorTrackingService>(ErrorTrackingService);
    prismaService = module.get<typeof prismaService>(PrismaService);
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
              amount?: bigint;
              circular?: { self?: unknown };
            };
            metadata?: { extra?: { value?: bigint } };
          }>;
        }
      | undefined;
    const payload = createManyFirstCall?.data?.[0];
    expect(payload).toBeDefined();
    expect(payload?.requestBody).toBeDefined();
    expect(payload?.metadata).toBeDefined();
    expect(payload!.requestBody!.amount).toBe(99n);
    expect(payload!.requestBody!.circular!.self).toBe(
      payload!.requestBody!.circular,
    );
    expect(payload!.metadata!.extra!.value).toBe(42n);
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
    expect(service['errorBuffer']).toHaveLength(0);

    service.logError(sampleError);
    expect(service['errorBuffer']).toHaveLength(1);
  });
});
