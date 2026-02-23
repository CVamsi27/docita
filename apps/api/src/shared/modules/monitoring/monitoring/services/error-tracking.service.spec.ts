import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@workspace/db';
import { ErrorTrackingService } from './error-tracking.service';
import { PrismaService } from '../../../../prisma/prisma.service';
import { MonitoringFactory } from '../factories/monitoring.factory';
import { ErrorLogInput } from '../schemas/monitoring.schema';

describe('ErrorTrackingService', () => {
  let service: ErrorTrackingService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    errorLog: {
      createMany: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      groupBy: jest.fn().mockResolvedValue([]),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
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
      ],
    }).compile();

    service = module.get<ErrorTrackingService>(ErrorTrackingService);
    prismaService = module.get<PrismaService>(PrismaService);
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
    const payload = (prismaService.errorLog.createMany as jest.Mock).mock
      .calls[0][0].data[0];
    expect(payload.requestBody.amount).toBe(99n);
    expect(payload.requestBody.circular.self).toBe(
      payload.requestBody.circular,
    );
    expect(payload.metadata.extra.value).toBe(42n);
  });

  it('continues buffering when database write fails', async () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError(
      'The table `public.ErrorLog` does not exist in the current database.',
      { code: 'P2021', clientVersion: 'test' },
    );

    (prismaService.errorLog.createMany as jest.Mock).mockRejectedValueOnce(
      prismaError,
    );

    service.logError(sampleError);
    await service.flushBuffer();

    expect(prismaService.errorLog.createMany).toHaveBeenCalledTimes(1);
    expect(service['errorBuffer']).toHaveLength(0);

    service.logError(sampleError);
    expect(service['errorBuffer']).toHaveLength(1);
  });
});
