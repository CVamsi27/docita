import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringService } from './monitoring.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MonitoringFactory } from './factories/monitoring.factory';

describe('MonitoringService', () => {
  let service: MonitoringService;
  let prisma: PrismaService;
  let factory: MonitoringFactory;

  const mockPrismaService = {
    apiRequest: {
      createMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    errorLog: {
      createMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    systemMetric: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  const mockFactory = {
    createApiRequest: jest.fn(),
    createErrorLog: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonitoringService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MonitoringFactory, useValue: mockFactory },
      ],
    }).compile();

    service = module.get<MonitoringService>(MonitoringService);
    prisma = module.get<PrismaService>(PrismaService);
    factory = module.get<MonitoringFactory>(MonitoringFactory);

    jest.clearAllMocks();
  });

  afterEach(() => {
    // Manually trigger cleanup to clear any timers
    service.onModuleDestroy();
  });

  describe('logRequest', () => {
    it('should validate data and add to buffer', () => {
      const data = {
        method: 'GET',
        path: '/test',
        statusCode: 200,
        duration: 10,
      };

      const validated = { ...data, clinicId: 'test-clinic' };
      mockFactory.createApiRequest.mockReturnValue(validated);

      service.logRequest(data);

      expect(factory.createApiRequest).toHaveBeenCalledWith(data);
      // Access private buffer for testing if needed, or spy on flushBuffers
    });
  });

  describe('logError', () => {
    it('should validate data and add to buffer', () => {
      const data = {
        type: 'Error',
        message: 'Test Error',
      };

      const validated = { ...data, severity: 'ERROR' };
      mockFactory.createErrorLog.mockReturnValue(validated);

      service.logError(data);

      expect(factory.createErrorLog).toHaveBeenCalledWith(data);
    });
  });
});
