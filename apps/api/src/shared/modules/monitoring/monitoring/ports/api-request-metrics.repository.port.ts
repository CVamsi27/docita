import type { RouteCategory } from '@workspace/db';

export interface ApiRequestMetricsFilter {
  startDate?: Date;
  endDate?: Date;
  clinicId?: string;
  /**
   * Restrict to one route family. Omitted means all families, which for latency
   * reporting is rarely what a reader wants: probe traffic dominates volume.
   */
  routeCategory?: RouteCategory;
}

export interface ResponseTimeDistributionRow {
  range_0_100: bigint;
  range_100_250: bigint;
  range_250_500: bigint;
  range_500_1000: bigint;
  range_1000_2000: bigint;
  range_2000_5000: bigint;
  range_5000_plus: bigint;
  /** Rows in the filter whose duration is not a believable latency sample. */
  invalid_latency_samples: bigint;
}

export interface ApiRequestMetricsRepository {
  getResponseTimeDistribution(
    filter: ApiRequestMetricsFilter,
  ): Promise<ResponseTimeDistributionRow[]>;

  getThroughputByMinute(
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ minute: string; count: bigint }>>;

  getRequestsByHour(
    filter: ApiRequestMetricsFilter,
  ): Promise<Array<{ hour: number; count: bigint }>>;
}

export const API_REQUEST_METRICS_REPOSITORY_TOKEN = Symbol(
  'ApiRequestMetricsRepository',
);
