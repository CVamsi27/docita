import { Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
  ANALYTICS_PERSISTENCE_PORT,
  type AnalyticsPersistencePort,
} from '@/domains/analytics/application/ports/analytics-persistence.port';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

export abstract class BaseAnalyticsFactory {
  protected readonly logger: Logger;

  constructor(
    @Inject(ANALYTICS_PERSISTENCE_PORT)
    protected prisma: AnalyticsPersistencePort,
    protected configService: AppConfigService,
    @Inject(CACHE_MANAGER) protected cacheManager: Cache,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  protected getReadClient() {
    return this.prisma.getReadClient();
  }

  protected addDateRangeFilter(
    where: Record<string, unknown>,
    startDate?: Date,
    endDate?: Date,
  ): void {
    if (startDate || endDate) {
      const range: { gte?: Date; lte?: Date } = {};
      if (startDate) range.gte = startDate;
      if (endDate) range.lte = endDate;
      where.createdAt = range;
    }
  }
}
