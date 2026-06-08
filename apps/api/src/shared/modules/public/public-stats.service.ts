import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '@/prisma/prisma.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

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
    // jscpd:ignore-start
    private readonly configService: AppConfigService,
  ) {}

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(' ');
  }

  private buildFallbackStats(): PlatformStats {
    // jscpd:ignore-end
    const config = this.configService.getPublicLandingStatsConfig();

    return {
      clinics: config.clinics ?? 0,
      doctors: config.doctors ?? 0,
      patients: config.patients ?? 0,
      prescriptions: config.prescriptions ?? 0,
      appointments: config.appointments ?? 0,
      uptime: config.uptime ?? this.formatUptime(process.uptime()),
    };
  }

  async getPlatformStats(): Promise<PlatformStats> {
    const cached = await this.cacheManager.get<PlatformStats>(this.cacheKey);
    if (cached) return cached;

    const result = await this.prisma
      // RLS-BYPASS: public stats aggregate platform-wide metrics without tenant session
      .runUnrestricted(async () => {
        const [clinics, doctors, patients, prescriptions, appointments] =
          await Promise.all([
            this.prisma.clinic.count({ where: { active: true } }),
            this.prisma.user.count({ where: { role: 'DOCTOR' } }),
            this.prisma.patient.count(),
            this.prisma.prescription.count(),
            this.prisma.appointment.count(),
          ]);

        return {
          clinics,
          doctors,
          patients,
          prescriptions,
          appointments,
          uptime:
            this.configService.getPublicLandingStatsConfig().uptime ??
            this.formatUptime(process.uptime()),
        } satisfies PlatformStats;
      })
      .catch(() => this.buildFallbackStats());

    await this.cacheManager.set(this.cacheKey, result, this.cacheTtlMs);
    return result;
  }
}
