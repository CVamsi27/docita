import { Test, TestingModule } from '@nestjs/testing';
import { ClinicAuthCacheService } from './clinic-auth-cache.service';
import { PrismaService } from '@/prisma/prisma.service';
import {
  ClinicTier,
  SubscriptionStatus,
  IntelligenceAddon,
} from '@workspace/db';

describe('ClinicAuthCacheService', () => {
  let service: ClinicAuthCacheService;
  let prisma: jest.Mocked<PrismaService>;

  const mockClinicData = {
    tier: ClinicTier.PRO,
    intelligenceAddon: IntelligenceAddon.ACTIVE,
    features: { CUSTOM_FEATURE: true },
    subscriptionStatus: SubscriptionStatus.ACTIVE,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicAuthCacheService,
        {
          provide: PrismaService,
          useValue: {
            clinic: {
              findUnique: jest.fn().mockResolvedValue(mockClinicData),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ClinicAuthCacheService>(ClinicAuthCacheService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getClinicAuth', () => {
    it('should fetch from database on cache miss', async () => {
      const result = await service.getClinicAuth('clinic-1');

      expect(result.tier).toBe(ClinicTier.PRO);
      expect(result.subscriptionStatus).toBe(SubscriptionStatus.ACTIVE);
      expect(result.hasIntelligence).toBe(true);
      expect(prisma.clinic.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should return cached data on cache hit', async () => {
      await service.getClinicAuth('clinic-1');

      await service.getClinicAuth('clinic-1');

      expect(prisma.clinic.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should cache different clinics separately', async () => {
      await service.getClinicAuth('clinic-1');
      await service.getClinicAuth('clinic-2');

      expect(prisma.clinic.findUnique).toHaveBeenCalledTimes(2);
    });

    it('should return feature overrides', async () => {
      const result = await service.getClinicAuth('clinic-1');
      expect(result.features).toEqual({ CUSTOM_FEATURE: true });
    });
  });

  describe('invalidate', () => {
    it('should clear cached data for a specific clinic', async () => {
      await service.getClinicAuth('clinic-1');
      expect(prisma.clinic.findUnique).toHaveBeenCalledTimes(1);

      service.invalidate('clinic-1');

      await service.getClinicAuth('clinic-1');
      expect(prisma.clinic.findUnique).toHaveBeenCalledTimes(2);
    });

    it('should not affect other cached clinics', async () => {
      await service.getClinicAuth('clinic-1');
      await service.getClinicAuth('clinic-2');

      service.invalidate('clinic-1');

      await service.getClinicAuth('clinic-2');
      expect(prisma.clinic.findUnique).toHaveBeenCalledTimes(2);
    });
  });

  describe('invalidateAll', () => {
    it('should clear all cached data', async () => {
      await service.getClinicAuth('clinic-1');
      await service.getClinicAuth('clinic-2');

      service.invalidateAll();

      await service.getClinicAuth('clinic-1');
      await service.getClinicAuth('clinic-2');

      expect(prisma.clinic.findUnique).toHaveBeenCalledTimes(4);
    });
  });

  describe('getCacheStats', () => {
    it('should report cache statistics', async () => {
      const initialStats = service.getCacheStats();
      expect(initialStats.size).toBe(0);

      await service.getClinicAuth('clinic-1');
      await service.getClinicAuth('clinic-2');

      const stats = service.getCacheStats();
      expect(stats.size).toBe(2);
    });
  });
});
