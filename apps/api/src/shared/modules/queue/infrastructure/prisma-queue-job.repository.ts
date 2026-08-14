import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type {
  QueueJobRepository,
  QueueJobRow,
} from '@/shared/modules/queue/ports/queue-job.repository.port';

@Injectable()
export class PrismaQueueJobRepository implements QueueJobRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Runs an RLS-bypassed raw query that returns a row array — shared by
   * `claimNextWaitingJob`, `recoverStaleActiveToDelayed`, and
   * `recoverStaleActiveToFailed`, which only differ in the `UPDATE ...
   * RETURNING` statement they execute. Keeping the bypass comment and
   * empty-array fallback in one place avoids the three drifting apart.
   */
  private async runUnrestrictedRows<T>(
    query: () => Promise<T[]>,
  ): Promise<T[]> {
    // RLS-BYPASS: background queue workers run without per-request clinic session
    return (await this.prisma.runUnrestricted(query)) ?? [];
  }

  async findRecentCompletedByIdempotency(
    name: string,
    idempotencyKey: string,
    completedSince: Date,
  ): Promise<QueueJobRow | null> {
    // RLS-BYPASS: background queue workers run without per-request clinic session
    const rows = await this.prisma.runUnrestricted(
      async () =>
        this.prisma.$queryRaw<QueueJobRow[]>`
          SELECT * FROM "QueueJob"
          WHERE name = ${name}
            AND "idempotencyKey" = ${idempotencyKey}
            AND status = 'COMPLETED'
            AND "completedAt" >= ${completedSince}
          ORDER BY "completedAt" DESC
          LIMIT 1
        `,
    );
    return rows[0] ?? null;
  }

  async claimNextWaitingJob(name: string): Promise<QueueJobRow[]> {
    return this.runUnrestrictedRows(
      () =>
        this.prisma.$queryRaw<QueueJobRow[]>`
        UPDATE "QueueJob"
        SET status = 'ACTIVE', "processedAt" = NOW(), "updatedAt" = NOW()
        WHERE id = (
          SELECT id FROM "QueueJob"
          WHERE name = ${name}
            AND status IN ('WAITING', 'DELAYED')
            AND ("delayedUntil" IS NULL OR "delayedUntil" <= NOW())
          ORDER BY priority DESC, "createdAt" ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        )
        RETURNING *
      `,
    );
  }

  async recoverStaleActiveToDelayed(
    name: string,
    staleBefore: Date,
    delayedUntil: Date,
  ): Promise<Array<{ id: string }>> {
    return this.runUnrestrictedRows(
      () =>
        this.prisma.$queryRaw<Array<{ id: string }>>`
        UPDATE "QueueJob"
        SET status = 'DELAYED',
            "attemptsMade" = "attemptsMade" + 1,
            "failedReason" = NULL,
            "delayedUntil" = ${delayedUntil},
            "updatedAt" = NOW()
        WHERE name = ${name}
          AND status = 'ACTIVE'
          AND "processedAt" < ${staleBefore}
          AND "attemptsMade" < "maxAttempts"
        RETURNING id
      `,
    );
  }

  async recoverStaleActiveToFailed(
    name: string,
    staleBefore: Date,
  ): Promise<Array<{ id: string }>> {
    return this.runUnrestrictedRows(
      () =>
        this.prisma.$queryRaw<Array<{ id: string }>>`
        UPDATE "QueueJob"
        SET status = 'FAILED',
            "failedReason" = 'Recovered stale ACTIVE job after timeout',
            "updatedAt" = NOW()
        WHERE name = ${name}
          AND status = 'ACTIVE'
          AND "processedAt" < ${staleBefore}
          AND "attemptsMade" >= "maxAttempts"
        RETURNING id
      `,
    );
  }

  async findById(jobId: string): Promise<QueueJobRow | null> {
    // RLS-BYPASS: background queue workers run without per-request clinic session
    const rows = await this.prisma.runUnrestricted(
      async () =>
        this.prisma.$queryRaw<QueueJobRow[]>`
          SELECT * FROM "QueueJob" WHERE id = ${jobId} LIMIT 1
        `,
    );
    return rows[0] ?? null;
  }

  async countByStatus(
    name: string,
  ): Promise<Array<{ status: string; count: bigint }>> {
    // RLS-BYPASS: background queue workers run without per-request clinic session
    return this.prisma.runUnrestricted(
      async () =>
        this.prisma.$queryRaw<Array<{ status: string; count: bigint }>>`
          SELECT status, COUNT(*) AS item_count
          FROM "QueueJob"
          WHERE name = ${name}
          GROUP BY status
        `,
    );
  }
}
