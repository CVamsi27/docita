import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import type { Prisma } from '@workspace/db';
import type { PrismaService } from '@/prisma/prisma.service';
import { PrismaInternalOperationalMetricsRepository } from '@/shared/modules/internal/infrastructure/prisma-internal-operational-metrics.repository';
import { InternalOperationalMetricsService } from '@/shared/modules/internal/internal-operational-metrics.service';
import type { OperationalSnapshot } from '@/shared/modules/internal/ports/internal-operational-metrics.repository.port';
import { requireMetricsTestDatabaseTarget } from './test-database-target';

const start = new Date('2026-09-01T00:00:00.000Z');
const end = new Date('2026-10-01T00:00:00.000Z');
const schema = `docita_metrics_${randomUUID().replaceAll('-', '')}`;
let client: Client | undefined;
let repository: PrismaInternalOperationalMetricsRepository;
let schemaCreated = false;

beforeAll(async () => {
  const target = requireMetricsTestDatabaseTarget(
    process.env.DOCITA_METRICS_TEST_DATABASE_URL,
  );
  client = new Client({
    connectionString: target,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 5_000,
  });
  await client.connect();
  await client.query(`CREATE SCHEMA "${schema}"`);
  schemaCreated = true;
  await client.query(`SET search_path TO "${schema}"`);
  await client.query(`
    CREATE TABLE "ApiRequest" (
      id text PRIMARY KEY, "statusCode" int NOT NULL, duration int NOT NULL,
      "routeCategory" text NOT NULL, "latencyValid" boolean NOT NULL,
      "observedAt" timestamptz NOT NULL, "createdAt" timestamptz NOT NULL
    );
    CREATE TABLE "Appointment" (
      id text PRIMARY KEY, "clinicId" text NOT NULL, "patientId" text NOT NULL,
      status text NOT NULL, "startTime" timestamptz NOT NULL
    );
    CREATE TABLE "Prescription" (
      id text PRIMARY KEY, "createdAt" timestamptz NOT NULL, "pdfGeneratedAt" timestamptz
    );
    CREATE TABLE "Invoice" (id text PRIMARY KEY, status text NOT NULL, "createdAt" timestamptz NOT NULL);
    CREATE TABLE "QueueJob" (id text PRIMARY KEY, status text NOT NULL, "createdAt" timestamptz NOT NULL);
  `);
  await client.query(`
    INSERT INTO "ApiRequest" VALUES
      ('late-success',200,100,'CUSTOMER',true,'2026-09-01T00:00:00Z','2026-10-02T00:00:00Z'),
      ('ordinary',200,200,'CUSTOMER',true,'2026-09-10T00:00:00Z','2026-09-10T00:00:00Z'),
      ('late-error',500,500,'CUSTOMER',true,'2026-09-30T00:00:00Z','2026-10-02T00:00:00Z'),
      ('flagged',200,9000,'CUSTOMER',false,'2026-09-15T00:00:00Z','2026-09-15T00:00:00Z'),
      ('negative',500,-5,'CUSTOMER',true,'2026-09-16T00:00:00Z','2026-09-16T00:00:00Z'),
      ('out-of-range',200,120001,'CUSTOMER',true,'2026-09-17T00:00:00Z','2026-09-17T00:00:00Z'),
      ('probe',200,1,'HEALTH_CHECK',true,'2026-09-20T00:00:00Z','2026-09-20T00:00:00Z'),
      ('internal',200,2,'INTERNAL',true,'2026-09-20T00:00:00Z','2026-09-20T00:00:00Z'),
      ('older-buffered',200,300,'CUSTOMER',true,'2026-08-31T23:59:59Z','2026-09-01T00:00:01Z'),
      ('exclusive-end',200,400,'CUSTOMER',true,'2026-10-01T00:00:00Z','2026-10-01T00:00:00Z');
    INSERT INTO "Appointment" VALUES
      ('a1','clinic-a','patient-1','COMPLETED','2026-09-01T00:00:00Z'),
      ('a2','clinic-a','patient-1','COMPLETED','2026-09-05T00:00:00Z'),
      ('a3','clinic-a','patient-2','COMPLETED','2026-09-10T00:00:00Z'),
      ('a4','clinic-b','patient-1','COMPLETED','2026-09-15T00:00:00Z'),
      ('a5','clinic-b','patient-3','CANCELLED','2026-09-20T00:00:00Z'),
      ('a6','clinic-demo','patient-4','SCHEDULED','2026-09-20T00:00:00Z'),
      ('a7','outside-clinic','outside-patient','COMPLETED','2026-10-01T00:00:00Z');
    INSERT INTO "Prescription" VALUES
      ('rx1','2026-09-10T00:00:00Z',NULL),
      ('rx2','2026-09-20T00:00:00Z','2026-09-20T00:01:00Z'),
      ('rx3','2026-10-01T00:00:00Z',NULL);
    INSERT INTO "Invoice" VALUES
      ('i1','PAID','2026-09-10T00:00:00Z'),
      ('i2','PENDING','2026-09-15T00:00:00Z'),
      ('i3','CANCELLED','2026-09-20T00:00:00Z'),
      ('i4','PAID','2026-10-01T00:00:00Z');
    INSERT INTO "QueueJob" VALUES
      ('j1','COMPLETED','2026-09-10T00:00:00Z'),
      ('j2','FAILED','2026-09-15T00:00:00Z'),
      ('j3','DEAD_LETTERED','2026-09-20T00:00:00Z'),
      ('j4','WAITING','2026-09-20T00:00:00Z'),
      ('j5','FAILED','2026-10-01T00:00:00Z');
  `);
  const fixtureClient = {
    $queryRaw: async (query: Prisma.Sql): Promise<OperationalSnapshot[]> => {
      if (!client)
        throw new Error('Fixture database connection is unavailable.');
      return (
        await client.query<OperationalSnapshot>(query.text, [...query.values])
      ).rows;
    },
  };
  // The fixture exposes only the real SQL boundary, rather than constructing Nest/Prisma pools.
  repository = new PrismaInternalOperationalMetricsRepository(
    fixtureClient as unknown as PrismaService,
  );
});

afterAll(async () => {
  if (!client) return;
  try {
    if (schemaCreated) await client.query(`DROP SCHEMA "${schema}" CASCADE`);
  } finally {
    await client.end();
  }
});

describe('operational metrics actual SQL', () => {
  it('uses customer observation time and retains invalid-duration requests in outcome counts', async () => {
    const result = await repository.read(start, end);
    expect(result).toMatchObject({
      requests: 6,
      errors: 2,
      validLatencySamples: 3,
      invalidLatencySamples: 3,
      firstSampleAt: start,
      lastSampleAt: new Date('2026-09-30T00:00:00.000Z'),
    });
  });

  it('computes interpolated percentiles only over valid customer durations', async () => {
    const result = await repository.read(start, end);
    expect(result).toMatchObject({
      p50Ms: 200,
      p95Ms: expect.closeTo(470, 6),
      p99Ms: expect.closeTo(494, 6),
    });
  });

  it('keeps the error rate measurable when every retained duration is invalid', async () => {
    if (!client) throw new Error('Fixture database connection is unavailable.');
    await client.query('BEGIN');
    try {
      await client.query('TRUNCATE "ApiRequest"');
      await client.query(`
        INSERT INTO "ApiRequest" VALUES
          ('flagged-only',200,100,'CUSTOMER',false,'2026-09-10T00:00:00Z','2026-09-10T00:00:00Z'),
          ('negative-only',500,-1,'CUSTOMER',true,'2026-09-11T00:00:00Z','2026-09-11T00:00:00Z'),
          ('over-cap-only',599,120001,'CUSTOMER',true,'2026-09-12T00:00:00Z','2026-09-12T00:00:00Z');
      `);
      expect(await repository.read(start, end)).toMatchObject({
        requests: 3,
        errors: 2,
        validLatencySamples: 0,
        invalidLatencySamples: 3,
        p50Ms: null,
        p95Ms: null,
        p99Ms: null,
        firstSampleAt: new Date('2026-09-10T00:00:00.000Z'),
        lastSampleAt: new Date('2026-09-12T00:00:00.000Z'),
      });

      const service = new InternalOperationalMetricsService(repository, {
        now: () => end,
      });
      expect((await service.getMetrics()).telemetry).toMatchObject({
        requestScope: 'CUSTOMER',
        samples: 3,
        serverErrors: 2,
        errorRatePercent: expect.closeTo(66.66666666666667, 12),
        validLatencySamples: 0,
        invalidLatencySamples: 3,
        p50Ms: null,
        p95Ms: null,
        p99Ms: null,
        firstSampleAt: '2026-09-10T00:00:00.000Z',
        lastSampleAt: '2026-09-12T00:00:00.000Z',
      });
    } finally {
      await client.query('ROLLBACK');
    }
  });

  it('preserves activity meanings and counts clinic-patient pairs and prescriptions independently of PDFs', async () => {
    const result = await repository.read(start, end);
    expect(result).toMatchObject({
      clinicsWithAppointments: 3,
      appointments: 6,
      completedAppointments: 4,
      clinicPatientsSeen: 3,
      prescriptionsCreated: 2,
      invoices: 3,
      jobs: 4,
      failedJobs: 1,
    });
  });

  it('returns unavailable percentiles and zero counts for an empty observation window', async () => {
    const result = await repository.read(
      new Date('2027-01-01T00:00:00Z'),
      new Date('2027-02-01T00:00:00Z'),
    );
    expect(result).toMatchObject({
      requests: 0,
      errors: 0,
      validLatencySamples: 0,
      invalidLatencySamples: 0,
      p50Ms: null,
      p95Ms: null,
      p99Ms: null,
      firstSampleAt: null,
      lastSampleAt: null,
      clinicsWithAppointments: 0,
      appointments: 0,
      completedAppointments: 0,
      clinicPatientsSeen: 0,
      prescriptionsCreated: 0,
      invoices: 0,
      jobs: 0,
      failedJobs: 0,
    });
  });

  it('aggregates the explicit 25-clinic month without treating seeded latency as an API benchmark', async () => {
    if (!client) throw new Error('Fixture database connection is unavailable.');
    await client.query('BEGIN');
    try {
      await client.query(`SET LOCAL statement_timeout = '30s'`);
      await client.query(
        'TRUNCATE "ApiRequest", "Appointment", "Prescription", "Invoice", "QueueJob"',
      );
      await client.query(`
        INSERT INTO "Appointment"
        SELECT 'a-' || clinic || '-' || visit, 'clinic-' || clinic,
          'patient-' || ((visit - 1) % 800 + 1), 'COMPLETED',
          '2026-09-01T00:00:00Z'::timestamptz + ((visit - 1) % 26) * interval '1 day'
        FROM generate_series(1,25) clinic CROSS JOIN generate_series(1,1040) visit;
        INSERT INTO "Prescription"
        SELECT 'rx-' || clinic || '-' || visit,
          '2026-09-01T00:00:00Z'::timestamptz + ((visit - 1) % 26) * interval '1 day', NULL
        FROM generate_series(1,25) clinic CROSS JOIN generate_series(1,832) visit;
        INSERT INTO "Invoice"
        SELECT 'i-' || clinic || '-' || visit, 'PENDING',
          '2026-09-01T00:00:00Z'::timestamptz + ((visit - 1) % 26) * interval '1 day'
        FROM generate_series(1,25) clinic CROSS JOIN generate_series(1,1040) visit;
        INSERT INTO "ApiRequest"
        SELECT 'r-' || request, 200, 100 + request % 300, 'CUSTOMER', true,
          '2026-09-01T00:00:00Z'::timestamptz + (request % 26) * interval '1 day',
          '2026-09-01T00:00:00Z'::timestamptz + (request % 26) * interval '1 day'
        FROM generate_series(1,520000) request;
      `);
      const result = await repository.read(start, end);
      expect(result).toMatchObject({
        clinicsWithAppointments: 25,
        appointments: 26000,
        completedAppointments: 26000,
        clinicPatientsSeen: 20000,
        prescriptionsCreated: 20800,
        invoices: 26000,
        requests: 520000,
        validLatencySamples: 520000,
        invalidLatencySamples: 0,
      });
      // Durations are supplied inputs. This test deliberately makes no API-speed assertion.
    } finally {
      await client.query('ROLLBACK');
    }
  }, 60000);
});
