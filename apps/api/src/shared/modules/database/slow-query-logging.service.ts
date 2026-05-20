import { Inject, Injectable, Logger } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { PrismaService } from '@/prisma/prisma.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

interface SlowQuery {
  query: string;
  duration: number;
  timestamp: Date;
}

@Injectable()
export class SlowQueryLoggingService {
  private readonly logger = new Logger(SlowQueryLoggingService.name);
  private slowQueries: SlowQuery[] = [];

  constructor(
    private prisma: PrismaService,
    private configService: AppConfigService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {
    this.setupQueryLogging();
  }

  private setupQueryLogging(): void {
    if (!this.prisma.$on) {
      this.logger.warn(
        'Prisma query event listener not available, slow query logging disabled',
      );
      return;
    }

    (
      this.prisma.$on as (
        event: string,
        handler: (e: {
          query: string;
          duration: number;
          params: string;
        }) => void,
      ) => void
    )('query', (event: { query: string; duration: number; params: string }) => {
      const duration = event.duration;
      const threshold = this.configService.getSlowQueryThreshold();

      if (duration > threshold) {
        const slowQuery: SlowQuery = {
          query: event.query,
          duration,
          timestamp: this.clock.now(),
        };

        this.slowQueries.push(slowQuery);

        if (this.slowQueries.length > 100) {
          this.slowQueries.shift();
        }

        this.logger.warn(
          `Slow query detected (${duration}ms): ${this.truncateQuery(event.query)}`,
        );
      }
    });
  }

  private truncateQuery(query: string): string {
    return query.length > 200 ? query.substring(0, 200) + '...' : query;
  }

  getSlowQueryStats(): {
    totalCount: number;
    averageDuration: number;
    maxDuration: number;
    minDuration: number;
    recentQueries: SlowQuery[];
  } {
    if (this.slowQueries.length === 0) {
      return {
        totalCount: 0,
        averageDuration: 0,
        maxDuration: 0,
        minDuration: 0,
        recentQueries: [],
      };
    }

    const durations = this.slowQueries.map((q) => q.duration);
    const totalDuration = durations.reduce((a, b) => a + b, 0);

    return {
      totalCount: this.slowQueries.length,
      averageDuration: Math.round(totalDuration / this.slowQueries.length),
      maxDuration: Math.max(...durations),
      minDuration: Math.min(...durations),
      recentQueries: this.slowQueries.slice(-10),
    };
  }

  clearHistory(): void {
    this.slowQueries = [];
    this.logger.log('Slow query history cleared');
  }
}
