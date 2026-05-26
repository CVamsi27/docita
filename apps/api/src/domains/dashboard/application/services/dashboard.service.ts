import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
  DASHBOARD_REPOSITORY_TOKEN,
  IDashboardRepository,
} from '@/domains/dashboard/core/repositories/dashboard.repository.interface';

/**
 * Thin facade — delegates dashboard stats to IDashboardRepository with cache.
 */
@Injectable()
export class DashboardService {
  constructor(
    @Inject(DASHBOARD_REPOSITORY_TOKEN)
    private readonly dashboardRepository: IDashboardRepository,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getStats(clinicId: string) {
    if (!clinicId) {
      return {
        totalPatients: 0,
        todayAppointments: 0,
        totalAppointments: 0,
        activePrescriptions: 0,
        recentActivity: [],
        upcomingAppointments: [],
      };
    }

    const cacheKey = `dashboard:stats:${clinicId}`;

    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.dashboardRepository.getStatsSnapshot(clinicId);

    await this.cacheManager.set(cacheKey, result, 60 * 1000);

    return result;
  }
}
