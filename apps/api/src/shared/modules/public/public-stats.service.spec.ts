import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Cache } from 'cache-manager';
import { PrismaService } from '@/prisma/prisma.service';
import { PublicStatsService } from './public-stats.service';
import { asType } from '@/test-utils/as-type';

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

    service = new PublicStatsService(
      asType<PrismaService>(prisma),
      asType<Cache>(cacheManager),
    );
  });

  it('returns cached stats when available', async () => {
    cacheManager.get.mockImplementation(async () => ({
      clinics: 1,
      doctors: 2,
      patients: 3,
      prescriptions: 4,
      appointments: 5,
      uptime: '99.9%',
    }));

    const result = await service.getPlatformStats();

    expect(result).toEqual({
      clinics: 1,
      doctors: 2,
      patients: 3,
      prescriptions: 4,
      appointments: 5,
      uptime: '99.9%',
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
      uptime: '99.9%',
    });
    expect(cacheManager.set).toHaveBeenCalledWith(
      'public:platform-stats',
      result,
      3600 * 1000,
    );
  });
});
