import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '@/prisma/prisma.service';

type PlatformStats = {
  clinics: number;
  doctors: number;
  patients: number;
  prescriptions: number;
  appointments: number;
  uptime: string;
};

@Injectable()
export class PublicStatsService {
  private readonly cacheKey = 'public:platform-stats';
  private readonly cacheTtlMs = 3600 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async getPlatformStats(): Promise<PlatformStats> {
    const cached = await this.cacheManager.get<PlatformStats>(this.cacheKey);
    if (cached) {
      return cached;
    }

    const [clinics, doctors, patients, prescriptions, appointments] =
      await this.prisma.runUnrestricted(async () =>
        Promise.all([
          this.prisma.clinic.count({ where: { active: true } }),
          this.prisma.user.count({ where: { role: 'DOCTOR' } }),
          this.prisma.patient.count(),
          this.prisma.prescription.count(),
          this.prisma.appointment.count(),
        ]),
      );

    const result: PlatformStats = {
      clinics,
      doctors,
      patients,
      prescriptions,
      appointments,
      uptime: '99.9%',
    };

    await this.cacheManager.set(this.cacheKey, result, this.cacheTtlMs);
    return result;
  }
}
