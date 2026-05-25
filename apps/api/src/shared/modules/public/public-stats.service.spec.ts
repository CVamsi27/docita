import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Cache } from 'cache-manager';
import { PrismaService } from '@/prisma/prisma.service';
import { PublicStatsService } from './public-stats.service';
import { asType } from '@/test-utils';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

describe('PublicStatsService', () => {
  let service: PublicStatsService;
  let cacheManager: {
    get: jest.Mock;
    set: jest.Mock;
  };
  let prisma: {
    runUnrestricted: jest.Mock;
    clinic: { count: jest.Mock };
    user: { count: jest.Mock };
    patient: { count: jest.Mock };
    prescription: { count: jest.Mock };
    appointment: { count: jest.Mock };
  };
  let configService: {
    getPublicLandingStatsConfig: jest.Mock;
  };

  beforeEach(() => {
    cacheManager = {
      get: jest.fn(),
      set: jest.fn().mockImplementation(async () => undefined),
    };

    prisma = {
      runUnrestricted: jest
        .fn()
        .mockImplementation((callback: unknown) =>
          (callback as () => Promise<unknown>)(),
        ),
      clinic: { count: jest.fn().mockImplementation(async () => 10) },
      user: { count: jest.fn().mockImplementation(async () => 20) },
      patient: { count: jest.fn().mockImplementation(async () => 30) },
      prescription: { count: jest.fn().mockImplementation(async () => 40) },
      appointment: { count: jest.fn().mockImplementation(async () => 50) },
    };

    configService = {
      getPublicLandingStatsConfig: jest.fn().mockReturnValue({
        clinics: 0,
        doctors: 0,
        patients: 0,
        prescriptions: 0,
        appointments: 0,
        uptime: undefined,
      }),
    };

    service = new PublicStatsService(
      asType<PrismaService>(prisma),
      asType<Cache>(cacheManager),
      asType<AppConfigService>(configService),
    );
  });

  it('returns cached stats when available', async () => {
    cacheManager.get.mockImplementation(async () => ({
      clinics: 1,
      doctors: 2,
      patients: 3,
      prescriptions: 4,
      appointments: 5,
      uptime: 'cached-uptime',
    }));

    const result = await service.getPlatformStats();

    expect(result).toEqual({
      clinics: 1,
      doctors: 2,
      patients: 3,
      prescriptions: 4,
      appointments: 5,
      uptime: 'cached-uptime',
    });
    expect(prisma.runUnrestricted).not.toHaveBeenCalled();
    expect(cacheManager.set).not.toHaveBeenCalled();
  });

  it('queries and caches stats when cache miss occurs', async () => {
    cacheManager.get.mockImplementation(async () => null);

    const result = await service.getPlatformStats();

    expect(prisma.runUnrestricted).toHaveBeenCalledTimes(1);
    expect(prisma.clinic.count).toHaveBeenCalledWith({
      where: { active: true },
    });
    expect(prisma.user.count).toHaveBeenCalledWith({
      where: { role: 'DOCTOR' },
    });
    expect(result).toEqual({
      clinics: 10,
      doctors: 20,
      patients: 30,
      prescriptions: 40,
      appointments: 50,
      uptime: expect.any(String),
    });
    expect(cacheManager.set).toHaveBeenCalledWith(
      'public:platform-stats',
      result,
      3600 * 1000,
    );
  });

  it('falls back to configured marketing stats when the database is unavailable', async () => {
    cacheManager.get.mockImplementation(async () => null);
    prisma.runUnrestricted.mockImplementation(async () => {
      throw new Error('database unavailable');
    });
    configService.getPublicLandingStatsConfig.mockReturnValue({
      clinics: 12,
      doctors: 34,
      patients: 56,
      prescriptions: 78,
      appointments: 90,
      uptime: undefined,
    });

    const result = await service.getPlatformStats();

    expect(result).toEqual({
      clinics: 12,
      doctors: 34,
      patients: 56,
      prescriptions: 78,
      appointments: 90,
      uptime: expect.any(String),
    });
  });
});
