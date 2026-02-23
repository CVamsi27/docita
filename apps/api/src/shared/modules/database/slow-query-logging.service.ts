/**
 * Slow Query Logging Service
 * Monitors and logs queries exceeding configured threshold
 * Helps identify performance bottlenecks
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

interface SlowQuery {
  query: string;
  duration: number;
  timestamp: Date;
}

@Injectable()
export class SlowQueryLoggingService {
  private readonly logger = new Logger(SlowQueryLoggingService.name);
  private readonly slowQueryThresholdMs = parseInt(
    process.env.SLOW_QUERY_THRESHOLD_MS || '1000',
    10,
  );
  private slowQueries: SlowQuery[] = [];

  constructor(private prisma: PrismaService) {
    this.setupQueryLogging();
  }

  /**
   * Setup Prisma query event listener for slow query detection
   */
  private setupQueryLogging(): void {
    if (!this.prisma.$on) {
      this.logger.warn(
        'Prisma query event listener not available, slow query logging disabled',
      );
      return;
    }

    // Prisma query event type is not fully exposed, so we use 'as any'
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

      if (duration > this.slowQueryThresholdMs) {
        const slowQuery: SlowQuery = {
          query: event.query,
          duration,
          timestamp: new Date(),
        };

        this.slowQueries.push(slowQuery);

        // Keep only last 100 queries in memory
        if (this.slowQueries.length > 100) {
          this.slowQueries.shift();
        }

        this.logger.warn(
          `Slow query detected (${duration}ms): ${this.truncateQuery(event.query)}`,
        );
      }
    });
  }

  /**
   * Truncate query to 200 chars for logging
   */
  private truncateQuery(query: string): string {
    return query.length > 200 ? query.substring(0, 200) + '...' : query;
  }

  /**
   * Get statistics on slow queries
   */
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

  /**
   * Clear slow query history
   */
  clearHistory(): void {
    this.slowQueries = [];
    this.logger.log('Slow query history cleared');
  }
}
