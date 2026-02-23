import { Test, TestingModule } from '@nestjs/testing';
import { PerformanceService } from './performance.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('PerformanceService', () => {
  let service: PerformanceService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PerformanceService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PerformanceService>(PerformanceService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('Dependency Injection', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should inject PrismaService', () => {
      expect(prismaService).toBeDefined();
    });
  });

  describe('getDatabaseStats', () => {
    it('should return database connection stats', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      const result = await service.getDatabaseStats();

      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
      expect(result).toHaveProperty('status', 'connected');
      expect(result).toHaveProperty('queryResponseTime');
      expect(result).toHaveProperty('timestamp');
      expect(result.queryResponseTime).toMatch(/\d+ms/);
    });

    it('should measure query response time', async () => {
      mockPrismaService.$queryRaw.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 10)),
      );

      const result = await service.getDatabaseStats();

      expect(result.queryResponseTime).toMatch(/\d+ms/);
      const responseTime = parseInt(result.queryResponseTime);
      expect(responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should include ISO timestamp', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      const result = await service.getDatabaseStats();

      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });

    it('should execute SELECT 1 query', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      await service.getDatabaseStats();

      expect(mockPrismaService.$queryRaw).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('SELECT 1')]),
      );
    });
  });

  describe('getMetrics', () => {
    it('should return memory usage metrics', () => {
      const result = service.getMetrics();

      expect(result).toHaveProperty('memory');
      expect(result.memory).toHaveProperty('rss');
      expect(result.memory).toHaveProperty('heapTotal');
      expect(result.memory).toHaveProperty('heapUsed');
      expect(result.memory).toHaveProperty('external');
      expect(result.memory.rss).toMatch(/\d+MB/);
      expect(result.memory.heapTotal).toMatch(/\d+MB/);
      expect(result.memory.heapUsed).toMatch(/\d+MB/);
      expect(result.memory.external).toMatch(/\d+MB/);
    });

    it('should return uptime metrics', () => {
      const result = service.getMetrics();

      expect(result).toHaveProperty('uptime');
      expect(result.uptime).toHaveProperty('seconds');
      expect(result.uptime).toHaveProperty('formatted');
      expect(typeof result.uptime.seconds).toBe('number');
      expect(result.uptime.seconds).toBeGreaterThanOrEqual(0);
      expect(typeof result.uptime.formatted).toBe('string');
    });

    it('should return node environment info', () => {
      const result = service.getMetrics();

      expect(result).toHaveProperty('node');
      expect(result.node).toHaveProperty('version');
      expect(result.node).toHaveProperty('platform');
      expect(result.node).toHaveProperty('arch');
      expect(result.node.version).toBe(process.version);
      expect(result.node.platform).toBe(process.platform);
      expect(result.node.arch).toBe(process.arch);
    });

    it('should include ISO timestamp', () => {
      const result = service.getMetrics();

      expect(result).toHaveProperty('timestamp');
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });

    it('should format memory values in megabytes', () => {
      const result = service.getMetrics();

      const rssValue = parseInt(result.memory.rss);
      const heapTotalValue = parseInt(result.memory.heapTotal);
      const heapUsedValue = parseInt(result.memory.heapUsed);
      const externalValue = parseInt(result.memory.external);

      expect(rssValue).toBeGreaterThan(0);
      expect(heapTotalValue).toBeGreaterThan(0);
      expect(heapUsedValue).toBeGreaterThan(0);
      expect(externalValue).toBeGreaterThanOrEqual(0);
    });

    it('should format uptime with days when uptime is high', () => {
      const originalUptime = process.uptime;
      jest.spyOn(process, 'uptime').mockReturnValue(90000); // ~1 day

      const result = service.getMetrics();

      expect(result.uptime.formatted).toContain('d');

      (process.uptime as jest.Mock).mockRestore();
    });

    it('should format uptime with hours and minutes', () => {
      const originalUptime = process.uptime;
      jest.spyOn(process, 'uptime').mockReturnValue(3665); // 1h 1m 5s

      const result = service.getMetrics();

      expect(result.uptime.formatted).toContain('h');
      expect(result.uptime.formatted).toContain('m');
      expect(result.uptime.formatted).toContain('s');

      (process.uptime as jest.Mock).mockRestore();
    });

    it('should format uptime with only seconds when uptime is low', () => {
      const originalUptime = process.uptime;
      jest.spyOn(process, 'uptime').mockReturnValue(30); // 30s

      const result = service.getMetrics();

      expect(result.uptime.formatted).toBe('30s');
      expect(result.uptime.formatted).not.toContain('m');
      expect(result.uptime.formatted).not.toContain('h');

      (process.uptime as jest.Mock).mockRestore();
    });

    it('should show 0s for zero uptime', () => {
      const originalUptime = process.uptime;
      jest.spyOn(process, 'uptime').mockReturnValue(0);

      const result = service.getMetrics();

      expect(result.uptime.formatted).toBe('0s');

      (process.uptime as jest.Mock).mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should propagate database connection errors', async () => {
      const error = new Error('Database connection failed');
      mockPrismaService.$queryRaw.mockRejectedValue(error);

      await expect(service.getDatabaseStats()).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('Integration', () => {
    it('should provide comprehensive health check data', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      const [dbStats, metrics] = await Promise.all([
        service.getDatabaseStats() as Promise<any>,
        service.getMetrics() as Promise<any>,
      ] as const);

      expect(dbStats.status).toBe('connected');
      expect(metrics.memory).toBeDefined();
      expect(metrics.uptime).toBeDefined();
      expect(metrics.node).toBeDefined();
    });

    it('should return consistent timestamp format across methods', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      const dbStats = await service.getDatabaseStats();
      const metrics = service.getMetrics();

      const dbTimestamp = new Date(dbStats.timestamp);
      const metricsTimestamp = new Date(metrics.timestamp);

      expect(dbTimestamp.toISOString()).toBe(dbStats.timestamp);
      expect(metricsTimestamp.toISOString()).toBe(metrics.timestamp);
    });
  });
});
