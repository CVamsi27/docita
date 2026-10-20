import { z } from "zod";

export const SystemHealthSchema = z.object({
  uptime: z.number(),
  memoryUsage: z.object({
    rss: z.number().int(),
    heapTotal: z.number().int(),
    heapUsed: z.number().int(),
    external: z.number().int(),
  }),
  cpuUsage: z.object({
    user: z.number(),
    system: z.number(),
  }),
  databaseConnected: z.boolean(),
  lastErrors: z.number().int(),
  avgResponseTime: z.number(),
  requestsLastHour: z.number().int(),
  errorsLastHour: z.number().int(),
});

/**
 * Route family for a retained request.
 *
 * Liveness and readiness probes run through the same global interceptor as
 * clinician traffic, so without this split a dashboard reports probe volume as
 * customer operations.
 */
export const routeCategorySchema = z.enum([
  "CUSTOMER",
  "HEALTH_CHECK",
  "INTERNAL",
]);
export type RouteCategoryName = z.infer<typeof routeCategorySchema>;

export const routeCategoryBreakdownSchema = z.object({
  customer: z.number().int().nonnegative(),
  healthCheck: z.number().int().nonnegative(),
  internal: z.number().int().nonnegative(),
});
export type RouteCategoryBreakdown = z.infer<
  typeof routeCategoryBreakdownSchema
>;

/**
 * Contract for GET /api/v1/monitoring/requests.
 *
 * `totalRequests` counts every retained row in the window; `byRouteCategory`
 * is the split callers must use to describe customer operations. The two
 * disagree on purpose — collapsing them is the defect this field set exists to
 * prevent.
 */
export const RequestStatsSchema = z.object({
  totalRequests: z.number().int().nonnegative(),
  successfulRequests: z.number().int().nonnegative(),
  failedRequests: z.number().int().nonnegative(),
  avgResponseTime: z.number(),
  requestsByPath: z.array(
    z.object({
      path: z.string(),
      count: z.number().int().nonnegative(),
      avgDuration: z.number(),
    }),
  ),
  requestsByStatus: z.array(
    z.object({
      statusCode: z.number().int(),
      count: z.number().int().nonnegative(),
    }),
  ),
  requestsByHour: z.array(
    z.object({ hour: z.number().int(), count: z.number().int().nonnegative() }),
  ),
  byRouteCategory: routeCategoryBreakdownSchema,
  /**
   * Rows whose duration fell outside the believable range. Retained for
   * inspection, excluded from every average, percentile and bucket above.
   */
  invalidLatencySamples: z.number().int().nonnegative(),
});
export type RequestStats = z.infer<typeof RequestStatsSchema>;

export const ErrorStatsSchema = z.object({
  totalErrors: z.number().int(),
  byType: z.record(z.number().int()),
  recentErrors: z.array(z.unknown()),
});

/**
 * Contract for GET /api/v1/monitoring/performance.
 *
 * Every latency figure here is computed from valid samples only; the excluded
 * count is reported so a reader can tell "fast" from "not measured".
 */
export const PerformanceMetricsSchema = z.object({
  slowestEndpoints: z.array(
    z.object({
      path: z.string(),
      method: z.string(),
      avgDuration: z.number(),
      maxDuration: z.number(),
      count: z.number().int().nonnegative(),
    }),
  ),
  responseTimeDistribution: z.array(
    z.object({ range: z.string(), count: z.number().int().nonnegative() }),
  ),
  throughputByMinute: z.array(
    z.object({ minute: z.string(), count: z.number().int().nonnegative() }),
  ),
  byRouteCategory: routeCategoryBreakdownSchema,
  invalidLatencySamples: z.number().int().nonnegative(),
});
export type PerformanceMetrics = z.infer<typeof PerformanceMetricsSchema>;

export type SystemHealth = z.infer<typeof SystemHealthSchema>;
export type ErrorStats = z.infer<typeof ErrorStatsSchema>;

export const WebVitalSchema = z.object({
  name: z.string().max(32),
  value: z.number(),
  rating: z.string().max(32),
  delta: z.number().optional(),
  id: z.string().max(128).optional(),
  navigationType: z.string().max(32).optional(),
  page: z.string().max(512).optional(),
  userId: z.string().max(128).optional(),
  sessionId: z.string().max(128).optional(),
  /** Discriminator for RUM source, e.g. clinician-app vs internal-admin */
  feature: z.string().max(64).optional(),
});

export const WebVitalsAggregateRowSchema = z.object({
  name: z.string(),
  count: z.number().int().nonnegative(),
  avg: z.number(),
  min: z.number(),
  max: z.number(),
  p75: z.number(),
  p95: z.number(),
  rating: z.enum(["good", "needs-improvement", "poor"]),
});

export const WebVitalsAggregateListSchema = z.array(
  WebVitalsAggregateRowSchema,
);

export type WebVitalsAggregateRow = z.infer<typeof WebVitalsAggregateRowSchema>;

export const securityMonitoringTopPathSchema = z.object({
  path: z.string(),
  method: z.string(),
  statusCode: z.number().int(),
  count: z.number().int().nonnegative(),
});

export const securityMonitoringSummarySchema = z.object({
  windowStart: z.string(),
  windowEnd: z.string(),
  totalRequests: z.number().int().nonnegative(),
  status401: z.number().int().nonnegative(),
  status403: z.number().int().nonnegative(),
  status429: z.number().int().nonnegative(),
  status5xx: z.number().int().nonnegative(),
  topAuthFailureRoutes: z.array(securityMonitoringTopPathSchema),
});

export type SecurityMonitoringSummary = z.infer<
  typeof securityMonitoringSummarySchema
>;

export const queueJobStatusSchema = z.enum([
  "WAITING",
  "ACTIVE",
  "COMPLETED",
  "FAILED",
  "DELAYED",
  "DEAD_LETTERED",
]);

export const queueHealthStatusCountSchema = z.object({
  status: queueJobStatusSchema,
  count: z.number().int().nonnegative(),
});

export const queueHealthNameCountSchema = z.object({
  name: z.string(),
  count: z.number().int().nonnegative(),
});

export const queueJobOutcomeSchema = z.enum([
  "COMPLETED",
  "RETRY_SCHEDULED",
  "DEAD_LETTERED",
  "CLAIM_LOST",
  "IDEMPOTENT_SKIP",
  "STALE_RECOVERED",
  "REPLAYED",
]);
export type QueueJobOutcome = z.infer<typeof queueJobOutcomeSchema>;

export const queueHealthOutcomeCountSchema = z.object({
  outcome: queueJobOutcomeSchema,
  count: z.number().int().nonnegative(),
});

export const queueHealthSummarySchema = z.object({
  countsByStatus: z.array(queueHealthStatusCountSchema),
  topQueuesByWaiting: z.array(queueHealthNameCountSchema),
  topQueuesByFailed: z.array(queueHealthNameCountSchema),
  deadLetteredLast24h: z.number().int().nonnegative(),
  /**
   * Append-only execution outcomes for the last 24h. QueueJob.status is current
   * state only, so these counts are what distinguishes a job that failed twice
   * and then succeeded from one that succeeded first time.
   */
  outcomesLast24h: z.array(queueHealthOutcomeCountSchema),
  /** Distinct jobs with at least one RETRY_SCHEDULED outcome in the window. */
  jobsRetriedLast24h: z.number().int().nonnegative(),
  /**
   * Distinct jobs with a RETRY_SCHEDULED outcome followed by COMPLETED: work
   * that failed and recovered inside the window.
   */
  jobsRecoveredLast24h: z.number().int().nonnegative(),
});

export type QueueHealthSummary = z.infer<typeof queueHealthSummarySchema>;

/**
 * One scheduled job's last recorded run. `CronHeartbeat` is written by the
 * `@TrackHeartbeat` decorator on every run and read back by nothing, so a cron
 * that silently stops running leaves a `lastRunAt` that ages with nobody
 * looking. `ageMs` is reported rather than a `stale` verdict on purpose: each
 * job has its own cadence and the decorator does not record it, so a single
 * threshold would be a guess.
 */
export const schedulerHeartbeatSchema = z.object({
  name: z.string(),
  lastRunAt: z.string(),
  lastStatus: z.enum(["SUCCESS", "FAILURE"]),
  ageMs: z.number().int().nonnegative(),
  lastError: z.string().nullable(),
});
export type SchedulerHeartbeat = z.infer<typeof schedulerHeartbeatSchema>;

/**
 * Whether the durable background backends are keeping up. Both are already
 * instrumented internally (the outbox relay's `attempts`/`nextAttemptAt`, and
 * cron heartbeats) but neither was readable by an operator, so "are jobs
 * draining?" could only be answered by reading logs.
 *
 * `oldestPendingAgeMs` is the outbox age of the longest-undelivered event;
 * `oldestRetryAgeMs` the same restricted to rows carrying a `lastError`. Both
 * are nullable: an empty backend has no age to report, and inventing `0` would
 * read as "brand new" rather than "nothing pending".
 */
export const backgroundJobsHealthSummarySchema = z.object({
  schedulers: z.array(schedulerHeartbeatSchema),
  schedulerSummary: z.object({
    total: z.number().int().nonnegative(),
    failing: z.number().int().nonnegative(),
    oldestAgeMs: z.number().int().nonnegative().nullable(),
  }),
  outbox: z.object({
    pending: z.number().int().nonnegative(),
    failing: z.number().int().nonnegative(),
    oldestPendingAgeMs: z.number().int().nonnegative().nullable(),
    oldestRetryAgeMs: z.number().int().nonnegative().nullable(),
  }),
  coverageNote: z.string(),
});
export type BackgroundJobsHealthSummary = z.infer<
  typeof backgroundJobsHealthSummarySchema
>;

export const telemetryCaptureStateSchema = z.enum([
  "CAPTURE_DISABLED",
  "CAPTURE_TRUNCATED",
  "CAPTURE_RECOVERED",
]);
export type TelemetryCaptureState = z.infer<typeof telemetryCaptureStateSchema>;

export const telemetryCaptureEventSchema = z.object({
  state: telemetryCaptureStateSchema,
  reason: z.string(),
  droppedRequests: z.number().int().nonnegative(),
  bufferedRequests: z.number().int().nonnegative(),
  recordedAt: z.string(),
});
export type TelemetryCaptureEvent = z.infer<typeof telemetryCaptureEventSchema>;

/**
 * COMPLETE — every request in the window is retained.
 * GAPS_RECORDED — some requests were dropped, and the drop is on record.
 * UNAVAILABLE — capture stopped before the window, so the retained rows cannot
 * describe the window at all.
 */
export const telemetryCoverageStateSchema = z.enum([
  "COMPLETE",
  "GAPS_RECORDED",
  "UNAVAILABLE",
]);
export type TelemetryCoverageState = z.infer<
  typeof telemetryCoverageStateSchema
>;

/**
 * Fixed wording attached to every coverage response so a reader cannot mistake
 * retained history for uptime. It is returned as data, not only documented.
 */
export const TELEMETRY_COVERAGE_NOTE =
  "Observation coverage is the first and last retained request timestamps plus recorded capture gaps. It is not uptime and proves nothing about periods with no retained rows.";

/** Contract for GET /api/v1/monitoring/telemetry-coverage. */
export const telemetryCoverageSchema = z.object({
  windowStart: z.string(),
  windowEnd: z.string(),
  state: telemetryCoverageStateSchema,
  firstObservedAt: z.string().nullable(),
  lastObservedAt: z.string().nullable(),
  retainedRequests: z.number().int().nonnegative(),
  byRouteCategory: routeCategoryBreakdownSchema,
  invalidLatencySamples: z.number().int().nonnegative(),
  captureEvents: z.array(telemetryCaptureEventSchema),
  droppedRequests: z.number().int().nonnegative(),
  coverageNote: z.literal(TELEMETRY_COVERAGE_NOTE),
});
export type TelemetryCoverage = z.infer<typeof telemetryCoverageSchema>;
