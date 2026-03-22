import { Controller, Get, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Public } from '@/shared/modules/auth/auth/public.decorator';
import { PrismaService } from '@/prisma/prisma.service';

@Controller('public')
export class PublicStatsController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Get('platform-stats')
  @Public()
  async getPlatformStats() {
    const cacheKey = 'public:platform-stats';
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const [clinics, doctors, patients, prescriptions, appointments] =
      await this.prisma.runUnrestricted(() =>
        Promise.all([
          this.prisma.clinic.count({ where: { active: true } }),
          this.prisma.user.count({ where: { role: 'DOCTOR' } }),
          this.prisma.patient.count(),
          this.prisma.prescription.count(),
          this.prisma.appointment.count(),
        ]),
      );

    const result = {
      clinics,
      doctors,
      patients,
      prescriptions,
      appointments,
      uptime: '99.9%',
    };

    await this.cacheManager.set(cacheKey, result, 3600 * 1000);
    return result;
  }
}
