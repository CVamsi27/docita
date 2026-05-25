export interface ApiRequestMetricsFilter {
  startDate?: Date;
  endDate?: Date;
  clinicId?: string;
}

export interface ResponseTimeDistributionRow {
  range_0_100: bigint;
  range_100_250: bigint;
  range_250_500: bigint;
  range_500_1000: bigint;
  range_1000_2000: bigint;
  range_2000_5000: bigint;
  range_5000_plus: bigint;
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
