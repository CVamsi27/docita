import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { Role, RouteCategory, QueueJobOutcome } from '@workspace/db';
import {
  telemetryCoverageSchema,
  queueHealthSummarySchema,
  RequestStatsSchema,
  PerformanceMetricsSchema,
} from '@workspace/types';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import { RequestLogService } from '@/shared/modules/monitoring/monitoring/services/request-log.service';
import { ErrorTrackingService } from '@/shared/modules/monitoring/monitoring/services/error-tracking.service';
import { MetricsQueryService } from '@/shared/modules/monitoring/monitoring/services/metrics-query.service';
import { TelemetryCaptureRecorder } from '@/shared/modules/monitoring/monitoring/services/telemetry-capture-recorder.service';
import { PrismaQueueJobRepository } from '@/shared/modules/queue/infrastructure/prisma-queue-job.repository';
import {
  setupTestDatabase,
  resetDatabase,
  getPrismaInstance,
  closeDatabase,
} from '../../setup';
import { factories, setPrismaInstance } from '../../factories';
import { signE2eAccessToken } from '../../e2e-auth-token';

/**
 * O02 — telemetry capture health and route category, against a real database.
 *
 * The unit specs prove the rules; this proves the persisted shape survives real
 * Postgres: timestamptz windows, the enum columns, the append-only execution
 * history and the coverage arithmetic reading real rows.
 *
 * Telemetry tables are not in the shared reset list (request logging is global
 * and other suites do not depend on it), so this spec truncates exactly the
 * tables it asserts on.
 */
const TELEMETRY_TABLES = [
  'ApiRequest',
  'ErrorLog',
  'TelemetryCaptureEvent',
  'QueueJobExecution',
  'QueueJob',
];

describe('Telemetry capture and route identity (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let requestLog: RequestLogService;
  let errorTracking: ErrorTrackingService;
  let metricsQuery: MetricsQueryService;
  let captureRecorder: TelemetryCaptureRecorder;
  let jwtService: JwtService;
  let queueJobs: PrismaQueueJobRepository;

  const truncateTelemetry = async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE ${TELEMETRY_TABLES.map((table) => `"${table}"`).join(
        ', ',
      )} CASCADE`,
    );
  };

  beforeAll(async () => {
    setupTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(getPrismaInstance())
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useLogger(false);
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();

    jwtService = app.get(JwtService);
    setPrismaInstance(getPrismaInstance());
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    requestLog = moduleFixture.get(RequestLogService);
    errorTracking = moduleFixture.get(ErrorTrackingService);
    metricsQuery = moduleFixture.get(MetricsQueryService);
    captureRecorder = moduleFixture.get(TelemetryCaptureRecorder);
    // QueueModule builds its repository inline for the 'queue' provider rather
    // than registering it, so the spec constructs the same implementation
    // directly instead of reaching into a private provider.
    queueJobs = new PrismaQueueJobRepository(prisma);
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  beforeEach(async () => {
    await resetDatabase();
    await truncateTelemetry();
  });

  const internalToken = async (): Promise<string> => {
    const { user } = await factories.user({
      clinicId: null,
      role: Role.INTERNAL,
    });
    return signE2eAccessToken(jwtService, {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      clinicId: user.clinicId,
    });
  };

  describe('route category and observation instant', () => {
    it('stores health probes and customer traffic in separate families', async () => {
      requestLog.logRequest({
        method: 'GET',
        path: '/api/health/ready',
        duration: 2,
        statusCode: 200,
        correlationId: 'probe-0001',
      });
      requestLog.logRequest({
        method: 'GET',
        path: '/api/v1/patients',
        duration: 40,
        statusCode: 200,
        correlationId: 'clinician-0001',
      });
      requestLog.logRequest({
        method: 'GET',
        path: '/api/v1/internal/clinics',
        duration: 15,
        statusCode: 200,
      });
      await requestLog.flushBuffer();

      const rows = await prisma.apiRequest.findMany({
        select: { path: true, routeCategory: true },
        orderBy: { path: 'asc' },
      });

      expect(rows).toEqual(
        expect.arrayContaining([
          {
            path: '/api/health/ready',
            routeCategory: RouteCategory.HEALTH_CHECK,
          },
          {
            path: '/api/v1/patients',
            routeCategory: RouteCategory.CUSTOMER,
          },
          {
            path: '/api/v1/internal/clinics',
            routeCategory: RouteCategory.INTERNAL,
          },
        ]),
      );
    });

    /**
     * The defect: a buffered row was attributed to its flush time, so a request
     * completed at 10:00 but written at 11:00 landed in the 11:00 rollup and the
     * hourly upsert kept it there.
     */
    it('keeps a late-flushed row in the window the request completed in', async () => {
      const completedAt = new Date('2026-10-03T10:00:30.000Z');

      // Simulate the outage: the row is buffered now and written much later.
      requestLog.logRequest({
        method: 'GET',
        path: '/api/v1/patients',
        duration: 25,
        statusCode: 200,
        observedAt: completedAt,
      });
      await new Promise((resolve) => setTimeout(resolve, 5));
      await requestLog.flushBuffer();

      const row = await prisma.apiRequest.findFirstOrThrow();
      expect(row.observedAt.toISOString()).toBe(completedAt.toISOString());
      // createdAt is the row age and is genuinely later than the request.
      expect(row.createdAt.getTime()).toBeGreaterThanOrEqual(
        row.observedAt.getTime(),
      );

      const tenOClock = await metricsQuery.getPerformanceMetrics(
        new Date('2026-10-03T10:00:00.000Z'),
        new Date('2026-10-03T10:59:59.000Z'),
      );
      expect(tenOClock.slowestEndpoints).toHaveLength(1);
      expect(tenOClock.throughputByMinute).toEqual([
        { minute: '2026-10-03T10:00', count: 1 },
      ]);

      // A window covering the write, but not the request, must not claim it.
      const writeTimeWindow = await metricsQuery.getPerformanceMetrics(
        new Date(completedAt.getTime() + 60 * 60 * 1000),
        new Date(completedAt.getTime() + 2 * 60 * 60 * 1000),
      );
      expect(writeTimeWindow.slowestEndpoints).toHaveLength(0);

      const tenOClockStats = await requestLog.getRequestStats(
        new Date('2026-10-03T10:00:00.000Z'),
        new Date('2026-10-03T10:59:59.000Z'),
      );
      expect(tenOClockStats.totalRequests).toBe(1);
    });

    it('reports the customer/health-check split and excludes probes from latency', async () => {
      for (let i = 0; i < 5; i++) {
        requestLog.logRequest({
          method: 'GET',
          path: '/api/health',
          duration: 1,
          statusCode: 200,
        });
      }
      requestLog.logRequest({
        method: 'GET',
        path: '/api/v1/patients',
        duration: 250,
        statusCode: 200,
      });
      await requestLog.flushBuffer();

      const stats = await requestLog.getRequestStats();
      expect(stats.byRouteCategory).toEqual({
        customer: 1,
        healthCheck: 5,
        internal: 0,
      });

      const all = await metricsQuery.getPerformanceMetrics();
      // Unfiltered returns every family with the split attached; the caller
      // chooses. Probes are not silently counted as customer latency.
      expect(all.byRouteCategory).toEqual({
        customer: 1,
        healthCheck: 5,
        internal: 0,
      });

      const customerOnly = await metricsQuery.getPerformanceMetrics(
        undefined,
        undefined,
        RouteCategory.CUSTOMER,
      );
      // Averaging the five 1ms probes would report ~42ms for the patients route.
      expect(customerOnly.slowestEndpoints).toEqual([
        expect.objectContaining({
          path: '/api/v1/patients',
          avgDuration: 250,
        }),
      ]);
      expect(customerOnly.byRouteCategory).toEqual({
        customer: 1,
        healthCheck: 0,
        internal: 0,
      });
      expect(
        customerOnly.responseTimeDistribution.find(
          (r) => r.range === '250-500ms',
        )?.count,
      ).toBe(1);
    });

    it('marks implausible durations invalid and keeps them out of averages', async () => {
      requestLog.logRequest({
        method: 'GET',
        path: '/api/v1/patients',
        duration: 90_000_000,
        statusCode: 200,
      });
      requestLog.logRequest({
        method: 'GET',
        path: '/api/v1/invoices',
        duration: 60,
        statusCode: 200,
      });
      await requestLog.flushBuffer();

      const rows = await prisma.apiRequest.findMany({
        select: { path: true, latencyValid: true },
        orderBy: { duration: 'asc' },
      });
      expect(rows).toEqual([
        { path: '/api/v1/invoices', latencyValid: true },
        { path: '/api/v1/patients', latencyValid: false },
      ]);

      const stats = await requestLog.getRequestStats();
      // Retained but not averaged: 60ms, not ~12.5 hours.
      expect(stats.avgResponseTime).toBe(60);
      expect(stats.invalidLatencySamples).toBe(1);
      expect(stats.requestsByPath.map((r) => r.path)).toEqual([
        '/api/v1/invoices',
      ]);
    });

    it('joins an error row to its request row through the opaque correlation id', async () => {
      requestLog.logRequest({
        method: 'POST',
        path: '/api/v1/invoices',
        duration: 30,
        statusCode: 500,
        error: 'InternalServerError',
        correlationId: 'trace-abc-123456',
      });
      errorTracking.logError({
        type: 'InternalServerError',
        message: 'boom',
        correlationId: 'trace-abc-123456',
      });
      await requestLog.flushBuffer();
      await errorTracking.flushBuffer();

      const request = await prisma.apiRequest.findFirstOrThrow({
        select: { correlationId: true },
      });
      const error = await prisma.errorLog.findFirstOrThrow({
        select: { correlationId: true },
      });
      expect(request.correlationId).toBe('trace-abc-123456');
      expect(error.correlationId).toBe('trace-abc-123456');

      const joinable = await prisma.apiRequest.findMany({
        where: { correlationId: 'trace-abc-123456' },
        select: { id: true },
      });
      expect(joinable).toHaveLength(1);
    });
  });

  describe('capture health', () => {
    it('reports COMPLETE while capture is working', async () => {
      requestLog.logRequest({
        method: 'GET',
        path: '/api/v1/patients',
        duration: 10,
        statusCode: 200,
      });
      await requestLog.flushBuffer();

      const coverage = await captureRecorder.getCoverage(
        new Date(Date.now() - 60 * 60 * 1000),
        new Date(Date.now() + 60 * 1000),
      );

      expect(telemetryCoverageSchema.parse(coverage).state).toBe('COMPLETE');
      expect(coverage.droppedRequests).toBe(0);
      expect(coverage.firstObservedAt).not.toBeNull();
      expect(coverage.lastObservedAt).not.toBeNull();
      expect(coverage.coverageNote).toContain('not uptime');
    });

    it('records a durable gap and reports GAPS_RECORDED afterwards', async () => {
      await captureRecorder.recordDisabled('DATABASE_AUTH_FAILURE', 120, 0);
      await captureRecorder.recordRecovered('DATABASE_RESTORED');
      requestLog.logRequest({
        method: 'GET',
        path: '/api/v1/patients',
        duration: 10,
        statusCode: 200,
      });
      await requestLog.flushBuffer();

      const coverage = await captureRecorder.getCoverage(
        new Date(Date.now() - 60 * 60 * 1000),
        new Date(Date.now() + 60 * 1000),
      );

      expect(coverage.state).toBe('GAPS_RECORDED');
      expect(coverage.droppedRequests).toBe(120);
      expect(coverage.captureEvents.map((e) => e.state)).toEqual([
        'CAPTURE_DISABLED',
        'CAPTURE_RECOVERED',
      ]);
      expect(coverage.captureEvents[0]?.reason).toBe('DATABASE_AUTH_FAILURE');
      expect(coverage.retainedRequests).toBe(1);
    });

    it('reports UNAVAILABLE when nothing was retained for the window', async () => {
      await prisma.apiRequest.create({
        data: {
          method: 'GET',
          path: '/api/v1/patients',
          statusCode: 200,
          duration: 5,
          observedAt: new Date('2020-01-01T00:00:00.000Z'),
        },
      });

      const coverage = await captureRecorder.getCoverage(
        new Date(Date.now() - 60 * 60 * 1000),
        new Date(Date.now() + 60 * 1000),
      );

      expect(coverage.state).toBe('UNAVAILABLE');
      expect(coverage.retainedRequests).toBe(0);
      // The retained row is still visible as the last known instant, which is
      // how an operator sees how stale the data is.
      expect(coverage.lastObservedAt).toBe('2020-01-01T00:00:00.000Z');
    });

    it('retains a gap recorded while the database was unreachable and writes it later', async () => {
      // Simulate the recorder's own write failing, which is the case that used to
      // make a gap permanently unreportable.
      const original = prisma.telemetryCaptureEvent.createMany.bind(
        prisma.telemetryCaptureEvent,
      );
      jest
        .spyOn(prisma.telemetryCaptureEvent, 'createMany')
        .mockRejectedValueOnce(new Error('connection refused'));

      await captureRecorder.recordDisabled('DATABASE_AUTH_FAILURE', 9, 0);
      expect(captureRecorder.getPendingCount()).toBe(1);

      await captureRecorder.flushPending();
      (prisma.telemetryCaptureEvent.createMany as jest.Mock).mockRestore();

      const persisted = await prisma.telemetryCaptureEvent.findMany({
        select: { reason: true, droppedRequests: true },
      });
      expect(persisted).toEqual([
        { reason: 'DATABASE_AUTH_FAILURE', droppedRequests: 9 },
      ]);
      expect(typeof original).toBe('function');
    });
  });

  describe('immutable job outcomes', () => {
    const seedJob = async (overrides: Record<string, unknown> = {}) =>
      prisma.queueJob.create({
        data: {
          name: 'email',
          data: {},
          status: 'COMPLETED',
          ...overrides,
        },
      });

    it('keeps outcomes that current job state cannot express', async () => {
      const job = await seedJob();

      await queueJobs.appendExecutions([
        {
          jobId: job.id,
          queueName: 'email',
          outcome: QueueJobOutcome.RETRY_SCHEDULED,
          attempt: 1,
          failedReason: 'smtp timeout',
          occurredAt: new Date('2026-10-03T09:00:00.000Z'),
        },
        {
          jobId: job.id,
          queueName: 'email',
          outcome: QueueJobOutcome.RETRY_SCHEDULED,
          attempt: 2,
          failedReason: 'smtp timeout',
          occurredAt: new Date('2026-10-03T09:01:00.000Z'),
        },
        {
          jobId: job.id,
          queueName: 'email',
          outcome: QueueJobOutcome.COMPLETED,
          attempt: 3,
          durationMs: 120,
          occurredAt: new Date('2026-10-03T09:02:00.000Z'),
        },
      ]);

      // The job row itself looks like a clean success.
      const row = await prisma.queueJob.findUniqueOrThrow({
        where: { id: job.id },
      });
      expect(row.status).toBe('COMPLETED');

      const history = await queueJobs.listExecutions(job.id);
      expect(history.map((h) => h.outcome)).toEqual([
        QueueJobOutcome.RETRY_SCHEDULED,
        QueueJobOutcome.RETRY_SCHEDULED,
        QueueJobOutcome.COMPLETED,
      ]);
      expect(history.map((h) => h.attempt)).toEqual([1, 2, 3]);
    });

    it('survives deletion of the job row', async () => {
      const job = await seedJob();
      await queueJobs.appendExecutions([
        {
          jobId: job.id,
          queueName: 'email',
          outcome: QueueJobOutcome.DEAD_LETTERED,
          attempt: 5,
          failedReason: 'permanent bounce',
          occurredAt: new Date(),
        },
      ]);

      await prisma.queueJob.delete({ where: { id: job.id } });

      const history = await queueJobs.listExecutions(job.id);
      expect(history).toHaveLength(1);
      expect(history[0]?.outcome).toBe(QueueJobOutcome.DEAD_LETTERED);
    });

    it('separates recovered retries from jobs that only retried', async () => {
      const recovered = await seedJob({ name: 'email' });
      const stillFailing = await seedJob({ name: 'pdf' });
      const clean = await seedJob({ name: 'whatsapp' });
      const now = new Date();

      await queueJobs.appendExecutions([
        {
          jobId: recovered.id,
          queueName: 'email',
          outcome: QueueJobOutcome.RETRY_SCHEDULED,
          attempt: 1,
          occurredAt: now,
        },
        {
          jobId: recovered.id,
          queueName: 'email',
          outcome: QueueJobOutcome.COMPLETED,
          attempt: 2,
          occurredAt: now,
        },
        {
          jobId: stillFailing.id,
          queueName: 'pdf',
          outcome: QueueJobOutcome.RETRY_SCHEDULED,
          attempt: 1,
          occurredAt: now,
        },
        {
          jobId: clean.id,
          queueName: 'whatsapp',
          outcome: QueueJobOutcome.COMPLETED,
          attempt: 1,
          occurredAt: now,
        },
      ]);

      const summary = await metricsQuery.getQueueHealthSummary();
      const parsed = queueHealthSummarySchema.parse(summary);

      expect(parsed.jobsRetriedLast24h).toBe(2);
      expect(parsed.jobsRecoveredLast24h).toBe(1);
      expect(
        parsed.outcomesLast24h.find(
          (row) => row.outcome === QueueJobOutcome.RETRY_SCHEDULED,
        )?.count,
      ).toBe(2);
      expect(parsed.countsByStatus.length).toBeGreaterThan(0);
    });

    it('records an execution row with the minimum attempt number', async () => {
      // The attempt >= 1 and durationMs >= 0 guards are CHECK constraints in
      // the migration only: `prisma db push` (how the e2e schema is prepared)
      // does not model CHECK constraints, so they cannot be asserted here. The
      // positive path is asserted instead and the constraint is verified
      // against a migration-applied database.
      const job = await seedJob();
      await queueJobs.appendExecutions([
        {
          jobId: job.id,
          queueName: 'email',
          outcome: QueueJobOutcome.COMPLETED,
          attempt: 1,
          durationMs: 0,
          occurredAt: new Date(),
        },
      ]);

      const history = await queueJobs.listExecutions(job.id);
      expect(history).toHaveLength(1);
      expect(history[0]?.attempt).toBe(1);
      expect(history[0]?.durationMs).toBe(0);
    });
  });

  describe('contract parity', () => {
    it('returns shapes that satisfy the shared response schemas', async () => {
      requestLog.logRequest({
        method: 'GET',
        path: '/api/health',
        duration: 1,
        statusCode: 200,
      });
      requestLog.logRequest({
        method: 'GET',
        path: '/api/v1/patients',
        duration: 30,
        statusCode: 200,
      });
      await requestLog.flushBuffer();

      const stats = await requestLog.getRequestStats();
      expect(RequestStatsSchema.parse(stats)).toEqual(stats);

      const performance = await metricsQuery.getPerformanceMetrics();
      expect(PerformanceMetricsSchema.parse(performance)).toEqual(performance);

      const coverage = await captureRecorder.getCoverage(
        new Date(Date.now() - 60 * 60 * 1000),
        new Date(Date.now() + 60 * 1000),
      );
      expect(telemetryCoverageSchema.parse(coverage)).toEqual(coverage);

      const queue = await metricsQuery.getQueueHealthSummary();
      expect(queueHealthSummarySchema.parse(queue)).toEqual(queue);
    });
  });

  /**
   * Over HTTP, not just at the service boundary.
   *
   * The dashboard consumes these routes, and the serializer is part of the
   * contract: the pre-O02 PerformanceMetricsSchema did not match the service
   * output, so `ZodSerializerDto` would have failed the request at runtime while
   * every service-level test still passed. These exercise the real route, the
   * real guard and the real response schema.
   */
  describe('monitoring routes over HTTP', () => {
    beforeEach(async () => {
      for (let i = 0; i < 4; i++) {
        requestLog.logRequest({
          method: 'GET',
          path: '/api/health',
          duration: 1,
          statusCode: 200,
        });
      }
      requestLog.logRequest({
        method: 'GET',
        path: '/api/v1/patients',
        duration: 180,
        statusCode: 200,
      });
      requestLog.logRequest({
        method: 'GET',
        path: '/api/v1/invoices',
        duration: 90,
        statusCode: 200,
      });
      await requestLog.flushBuffer();
    });

    it('serves telemetry coverage as the shared schema', async () => {
      const response = await request(app.getHttpServer())
        .get('/monitoring/telemetry-coverage')
        .set('Authorization', `Bearer ${await internalToken()}`)
        .expect(200);

      expect(telemetryCoverageSchema.parse(response.body)).toEqual(
        response.body,
      );
      expect(response.body.state).toBe('COMPLETE');
      expect(response.body.byRouteCategory.customer).toBe(2);
      expect(response.body.byRouteCategory.healthCheck).toBe(4);
      // The "not uptime" wording travels with the payload, not only the docs.
      expect(response.body.coverageNote).toContain('not uptime');
    });

    it('honours the routeCategory query parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/monitoring/performance?routeCategory=CUSTOMER')
        .set('Authorization', `Bearer ${await internalToken()}`)
        .expect(200);

      expect(PerformanceMetricsSchema.parse(response.body)).toEqual(
        response.body,
      );
      // Probes are filtered server-side: no /api/health row survives.
      expect(
        response.body.slowestEndpoints.map((row: { path: string }) => row.path),
      ).toEqual(['/api/v1/patients', '/api/v1/invoices']);
      expect(response.body.byRouteCategory).toEqual({
        customer: 2,
        healthCheck: 0,
        internal: 0,
      });
    });

    it('ignores an unknown routeCategory instead of failing the endpoint', async () => {
      const response = await request(app.getHttpServer())
        .get('/monitoring/performance?routeCategory=NOT_A_CATEGORY')
        .set('Authorization', `Bearer ${await internalToken()}`)
        .expect(200);

      // Falls back to the unfiltered result rather than 500-ing a dashboard.
      expect(response.body.byRouteCategory.customer).toBe(2);
      expect(response.body.byRouteCategory.healthCheck).toBe(4);
    });

    it('serves request stats as the shared schema', async () => {
      const response = await request(app.getHttpServer())
        .get('/monitoring/requests')
        .set('Authorization', `Bearer ${await internalToken()}`)
        .expect(200);

      expect(RequestStatsSchema.parse(response.body)).toEqual(response.body);
      expect(response.body.totalRequests).toBe(6);
    });

    it('serves queue health with the execution outcome fields', async () => {
      const response = await request(app.getHttpServer())
        .get('/monitoring/queue-health')
        .set('Authorization', `Bearer ${await internalToken()}`)
        .expect(200);

      expect(queueHealthSummarySchema.parse(response.body)).toEqual(
        response.body,
      );
      expect(response.body).toHaveProperty('jobsRecoveredLast24h', 0);
    });

    it('requires an internal role', async () => {
      const doctor = await factories.user({ role: Role.DOCTOR });
      const doctorToken = signE2eAccessToken(jwtService, {
        sub: doctor.user.id,
        email: doctor.user.email,
        role: doctor.user.role,
        name: doctor.user.name,
        clinicId: doctor.user.clinicId,
      });

      await request(app.getHttpServer())
        .get('/monitoring/telemetry-coverage')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403);
    });
  });
});
