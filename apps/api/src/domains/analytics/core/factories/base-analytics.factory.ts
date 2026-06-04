import { Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '@/prisma/prisma.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

export abstract class BaseAnalyticsFactory {
  protected readonly logger: Logger;

  constructor(
    protected prisma: PrismaService,
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
