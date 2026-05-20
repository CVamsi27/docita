import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import type { SystemLogEntry } from '@workspace/types';
import { InternalLogActivityFallbackService } from './logs/internal-log-activity-fallback.service';
import { InternalLogStorageQueryService } from './logs/internal-log-storage-query.service';
import type { InternalLogFilters } from './logs/internal-log.types';

export type { InternalLogFilters as LogFilters } from './logs/internal-log.types';

@Injectable()
export class InternalLogService {
  private readonly logger = new Logger(InternalLogService.name);

  constructor(
    private readonly storageQuery: InternalLogStorageQueryService,
    private readonly activityFallback: InternalLogActivityFallbackService,
  ) {}

  async getLogs(
    limit: number = 50,
    offset: number = 0,
    filters: InternalLogFilters = {},
  ): Promise<{ data: SystemLogEntry[]; total: number }> {
    try {
      const safeLimit = Number.isFinite(limit)
        ? Math.min(Math.max(limit, 1), 100)
        : 50;
      const safeOffset = Number.isFinite(offset) ? Math.max(offset, 0) : 0;

      const stored = await this.storageQuery.queryStoredLogs(
        safeLimit,
        safeOffset,
        filters,
      );

      if (stored.data.length > 0) {
        return stored;
      }

      return this.activityFallback.queryRecentActivityLogs(
        safeLimit,
        safeOffset,
        filters,
      );
    } catch (error) {
      this.logger.error('Failed to fetch logs', error);
      throw new InternalServerErrorException('Failed to fetch logs');
    }
  }
}
