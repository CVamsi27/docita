import { PrismaClient, Prisma } from '@workspace/db';
import { execSync } from 'child_process';
import path from 'path';

import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import {
  createUtcPoolConfig,
  createPoolSaturationProbe,
  type PoolSaturationProbe,
} from '@workspace/db';

import {
  evaluateResetDuration,
  evaluateSchemaPushCount,
  evaluateSchemaPushDuration,
} from '@/test-utils/reset-budget';

let prisma: TestPrismaClient;
/** The pool every suite in this process shares, kept for pressure reporting. */
let testPoolSaturation: PoolSaturationProbe | null = null;

type TestPrismaClient = PrismaClient & {
  getReadClient(): PrismaClient;
  runUnrestricted<T>(fn: () => Promise<T>): Promise<T>;
};

// Every suite used to run `prisma db push --force-reset` in its beforeAll,
// dropping and recreating the ENTIRE schema once per suite (~20 times per
// shard). That repeated DDL — combined with the 55-statement truncate in
// resetDatabase — is what generated the 100-180s Postgres checkpoints in
// the runner logs and the `Exceeded timeout of 30000 ms for a hook` failures
// on beforeEach under CI disk I/O pressure. Suite isolation is by truncation
// (resetDatabase), not schema recreation, and no migration runs mid-process,
// so one push per jest process is sufficient. Local runs keep working: the
// first suite prepares the schema exactly as before.
let schemaPrepared = false;
let schemaPushCount = 0;

export function setupTestDatabase() {
  const testDbUrl = process.env.DATABASE_URL;

  if (!testDbUrl)
    throw new Error(
      'DATABASE_URL is not defined. Tests must run against a dedicated test database.',
    );

  const pool = new Pool(createUtcPoolConfig({ connectionString: testDbUrl }));
  testPoolSaturation = createPoolSaturationProbe(pool);
  const adapter = new PrismaPg(pool, { disposeExternalPool: true });
  const rawPrisma = new PrismaClient({ adapter });

  prisma = Object.assign(rawPrisma, {
    getReadClient(): PrismaClient {
      return rawPrisma;
    },
    runUnrestricted<T>(fn: () => Promise<T>): Promise<T> {
      return fn();
    },
  }) as TestPrismaClient;

  try {
    if (!schemaPrepared) {
      schemaPushCount += 1;
      const countVerdict = evaluateSchemaPushCount(schemaPushCount);
      if (countVerdict.level === 'fail') {
        // The #295 memoization contract is broken: suites are isolated by
        // truncation, not schema recreation. Fail loudly instead of silently
        // re-introducing the per-suite push churn that caused the shard flake.
        throw new Error(countVerdict.message);
      }

      const pushStartedAt = performance.now();
      execSync('pnpm exec prisma db push --accept-data-loss --force-reset', {
        cwd: path.join(__dirname, '../../..', 'packages/db'),
        env: {
          ...process.env,
          DATABASE_URL: testDbUrl,
        },
        stdio: 'pipe',
      });
      const pushVerdict = evaluateSchemaPushDuration(
        performance.now() - pushStartedAt,
      );
      if (pushVerdict.level === 'warn') {
        process.stderr.write(`[reset-budget] ${pushVerdict.message}\n`);
      }

      // `db push` cannot express objects that only exist in migrations
      // (EXCLUDE constraints, triggers, and their extensions). Apply them
      // so the test database carries the same invariants production runs
      // with — otherwise concurrency tests pass or fail differently than
      // production would (W01 booking race, onboarding preservation).
      execSync(
        `pnpm exec prisma db execute --file "${path.join(
          __dirname,
          'fixtures',
          'migration-only-ddl.sql',
        )}"`,
        {
          cwd: path.join(__dirname, '../../..', 'packages/db'),
          env: {
            ...process.env,
            DATABASE_URL: testDbUrl,
          },
          stdio: 'pipe',
        },
      );

      schemaPrepared = true;
    }
  } catch (error) {
    const execError = error as {
      message?: string;
      stderr?: Buffer;
      stdout?: Buffer;
    };
    const stderr = execError.stderr?.toString().trim();
    const stdout = execError.stdout?.toString().trim();
    throw new Error(
      [
        'Failed to prepare test database (prisma db push or the migration-only DDL fixture).',
        `DATABASE_URL=${testDbUrl}`,
        stderr ? `stderr: ${stderr}` : undefined,
        stdout ? `stdout: ${stdout}` : undefined,
        execError.message ? `error: ${execError.message}` : undefined,
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }

  return prisma;
}

export async function resetDatabase() {
  if (!prisma) return;

  const tables = [
    'RefreshToken',
    'SubscriptionReminder',
    'SubscriptionPayment',
    'Subscription',
    'ReferralCredit',
    'Referral',
    'ErrorLog',
    'ApiRequest',
    'ApiHttpIdempotencyRecord',
    'WebhookReplayDedupe',
    'SystemMetric',
    'PerformanceAggregate',
    'WhatsappMessage',
    'WhatsappConversation',
    'WhatsappFlow',
    'WhatsappLog',
    'LabTestOrder',
    'LabTest',
    'InventoryMovement',
    'InventoryItem',
    'QueueToken',
    'QueueJob',
    'Admission',
    'Bed',
    'Room',
    'Ward',
    'AppointmentReminder',
    'ReminderSettings',
    'PatientMergeSuggestion',
    'OcrDocument',
    'ImportJob',
    'DoctorFavoriteCode',
    'Procedure',
    'Diagnosis',
    'VitalSign',
    'Medication',
    'Prescription',
    'Invoice',
    'PaymentSession',
    'Document',
    'PatientTag',
    'Patient',
    'ClinicalTemplate',
    'CustomField',
    'DoctorTimeOff',
    'ClinicWeeklySchedule',
    'DoctorSchedule',
    'DoctorSpecialization',
    'DoctorCertification',
    'DoctorEducation',
    'DoctorClinic',
    'Appointment',
    'Clinic',
    'User',
    'PrescriptionTemplate',
    'AuditLog',
    'Feedback',
    'IcdCode',
    'CptCode',
  ];

  const resetStartedAt = performance.now();
  try {
    // One statement instead of 55 sequential round-trips: a single TRUNCATE
    // with CASCADE resolves dependent tables in one lock pass and one commit,
    // removing the per-statement lock acquisition and WAL flush that amplified
    // runner disk-I/O stalls into 30s+ beforeEach hooks. CASCADE also makes
    // the per-table order irrelevant (dependents are truncated once, not once
    // per referencing table).
    await prisma.$executeRaw(
      Prisma.sql`TRUNCATE TABLE ${Prisma.join(
        tables.map((table) => Prisma.raw(`"${table}"`)),
        ', ',
      )} CASCADE`,
    );
  } catch {
    // Fall back to per-table truncation (skipping missing tables) for locally
    // outdated schemas where one of the listed tables does not exist.
    for (const table of tables) {
      try {
        await prisma.$executeRaw(
          Prisma.sql`TRUNCATE TABLE ${Prisma.raw(`"${table}"`)} CASCADE`,
        );
      } catch {
        // Table may not exist yet; skip silently
      }
    }
  }

  // Budget guard: a reset that takes tens of seconds means the reset path has
  // regressed (e.g. a reintroduced per-table loop). Fail with a clear message
  // before the 30s jest hook timeout turns it into a generic hook failure.
  const resetVerdict = evaluateResetDuration(
    performance.now() - resetStartedAt,
  );
  if (resetVerdict.level === 'fail') {
    throw new Error(resetVerdict.message);
  }
  if (resetVerdict.level === 'warn') {
    process.stderr.write(`[reset-budget] ${resetVerdict.message}\n`);
  }
}

export async function closeDatabase() {
  if (prisma) {
    await prisma.$disconnect();
  }
}

export function getPrismaInstance() {
  return prisma;
}

/**
 * Pressure snapshot for intermittent failures: how many backends are connected
 * to the test database and in what state, plus this process's heap and uptime.
 *
 * A full 2/4-shard run packs many heavy suites into one process, and failures
 * seen only in that context (an untranslated 500, a `socket hang up`) are
 * prohibitively expensive to reproduce. Assertions in the suites that have
 * shown them embed this snapshot in the failure message, so the next occurrence
 * carries its own cause instead of needing an 8-minute reproduction loop.
 *
 * `pool` reports the shared test pool's own saturation. `pg_stat_activity`
 * alone cannot distinguish "PostgreSQL is slow" from "every caller is queued
 * for a connection", which is the distinction the pool counters make.
 */
export async function captureE2ePressureSnapshot(): Promise<
  Record<string, unknown>
> {
  const heap = process.memoryUsage();
  let dbActivity: Record<string, unknown> | null = null;

  const testDbUrl = process.env.DATABASE_URL;
  if (testDbUrl) {
    const pool = new Pool(createUtcPoolConfig({ connectionString: testDbUrl }));
    try {
      const rows = await pool.query<{ state: string; count: string }>(
        `SELECT COALESCE(state, 'unknown') AS state, count(*)::text AS count
         FROM pg_stat_activity
         WHERE datname = current_database()
         GROUP BY 1
         ORDER BY 1`,
      );
      dbActivity = Object.fromEntries(
        rows.rows.map((row) => [row.state, Number(row.count)]),
      );
    } catch (error) {
      dbActivity = {
        error: error instanceof Error ? error.message : 'unknown error',
      };
    } finally {
      await pool.end();
    }
  }

  return {
    heapUsedMb: Math.round(heap.heapUsed / 1024 / 1024),
    rssMb: Math.round(heap.rss / 1024 / 1024),
    processUptimeSeconds: Math.round(process.uptime()),
    pool: testPoolSaturation?.snapshot() ?? 'not initialized',
    dbActivity,
  };
}
