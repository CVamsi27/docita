/**
 * N+1 Query Prevention Service
 * Detects and helps eliminate N+1 query patterns
 * Tracks query execution and provides recommendations
 */

import { Injectable, Logger } from '@nestjs/common';

export interface QueryTrace {
  query: string;
  timestamp: Date;
  duration: number;
  parentQuery?: string;
  isRelated: boolean;
}

@Injectable()
export class N1QueryDetectionService {
  private readonly logger = new Logger(N1QueryDetectionService.name);
  private queryTraces: QueryTrace[] = [];
  private readonly maxTraces = 200;

  /**
   * Record a query for analysis
   */
  recordQuery(query: string, duration: number, parentQuery?: string): void {
    const trace: QueryTrace = {
      query,
      timestamp: new Date(),
      duration,
      parentQuery,
      isRelated: !!parentQuery,
    };

    this.queryTraces.push(trace);

    if (this.queryTraces.length > this.maxTraces) {
      this.queryTraces = this.queryTraces.slice(-this.maxTraces);
    }
  }

  /**
   * Analyze for N+1 query patterns
   */
  analyzeForN1Patterns(): Array<{
    pattern: string;
    count: number;
    totalDuration: number;
    recommendation: string;
  }> {
    const patterns = new Map<string, QueryTrace[]>();

    // Group similar queries
    this.queryTraces.forEach((trace) => {
      const normalized = this.normalizeQuery(trace.query);
      if (!patterns.has(normalized)) {
        patterns.set(normalized, []);
      }
      patterns.get(normalized)!.push(trace);
    });

    // Detect N+1 patterns (multiple similar queries)
    const potentialN1 = Array.from(patterns.entries())
      .filter(([_, traces]) => traces.length > 5) // More than 5 similar queries
      .map(([pattern, traces]) => ({
        pattern,
        count: traces.length,
        totalDuration: traces.reduce((sum, t) => sum + t.duration, 0),
        recommendation: this.getN1Recommendation(pattern, traces.length),
      }))
      .sort((a, b) => b.totalDuration - a.totalDuration);

    if (potentialN1.length > 0) {
      this.logger.warn(
        `Detected ${potentialN1.length} potential N+1 query patterns. Top: ${potentialN1[0].pattern.substring(0, 100)}...`
      );
    }

    return potentialN1;
  }

  /**
   * Get optimization recommendations for a query pattern
   */
  private getN1Recommendation(pattern: string, count: number): string {
    if (pattern.includes('SELECT') && pattern.includes('WHERE')) {
      if (pattern.includes('JOIN')) {
        return `Use batch loading instead of loop queries (${count} detected). Consider using include() for relations.`;
      }
      return `Use JOIN or include() to fetch related data in single query instead of ${count} separate queries.`;
    }

    if (pattern.includes('UPDATE') || pattern.includes('DELETE')) {
      return `Consider batch operations instead of individual ${count} statements. Use WHERE clause for bulk updates.`;
    }

    return `Optimize this repeated pattern (${count} executions). Consider eager loading or batch processing.`;
  }

  /**
   * Normalize query for pattern matching
   */
  private normalizeQuery(query: string): string {
    return (
      query
        .replace(/\d+/g, '?') // Replace numbers with ?
        .replace(/'.+?'/g, '?') // Replace strings with ?
        .trim()
    );
  }

  /**
   * Get query statistics
   */
  getStatistics(): {
    totalQueries: number;
    averageDuration: number;
    slowestQuery: string;
    n1PatternsDetected: number;
  } {
    if (this.queryTraces.length === 0) {
      return {
        totalQueries: 0,
        averageDuration: 0,
        slowestQuery: '',
        n1PatternsDetected: 0,
      };
    }

    const avgDuration = this.queryTraces.reduce((sum, t) => sum + t.duration, 0) / this.queryTraces.length;
    const slowestQuery = this.queryTraces.reduce((slow, t) => (t.duration > slow.duration ? t : slow)).query;
    const n1Patterns = this.analyzeForN1Patterns();

    return {
      totalQueries: this.queryTraces.length,
      averageDuration: Math.round(avgDuration),
      slowestQuery: slowestQuery.substring(0, 100),
      n1PatternsDetected: n1Patterns.length,
    };
  }

  /**
   * Clear query history
   */
  clear(): void {
    this.queryTraces = [];
  }
}
