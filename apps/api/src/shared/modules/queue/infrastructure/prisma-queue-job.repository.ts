import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '@/prisma/prisma.service';
import type {
  QueueJobClaimTransition,
  QueueJobExecutionRecord,
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
    return (await this.prisma.runUnrestricted(async () => query())) ?? [];
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

  /**
   * Claims one waiting job and stamps a fresh claim token on it. The token is
   * what later fences this worker's acknowledgment to this claim, so a job
   * whose lease is reclaimed carries a different token for its new owner.
   */
  async claimNextWaitingJob(name: string): Promise<QueueJobRow[]> {
    const claimToken = randomUUID();
    return this.runUnrestrictedRows(
      () =>
        this.prisma.$queryRaw<QueueJobRow[]>`
        UPDATE "QueueJob"
        SET status = 'ACTIVE',
            "processedAt" = NOW(),
            "claimToken" = ${claimToken},
            "updatedAt" = NOW()
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

  async applyClaimTransition(
    id: string,
    claimToken: string,
    data: QueueJobClaimTransition,
  ): Promise<boolean> {
    // RLS-BYPASS: background queue workers run without per-request clinic session
    const rows = await this.prisma.runUnrestricted(
      async () =>
        this.prisma.$queryRaw<Array<{ id: string }>>`
        UPDATE "QueueJob"
        SET status = ${data.status}::"QueueJobStatus",
            "completedAt" = ${data.completedAt ?? null},
            "deadLetteredAt" = ${data.deadLetteredAt ?? null},
            "failedReason" = ${data.failedReason ?? null},
            "attemptsMade" = COALESCE(${data.attemptsMade ?? null},
                                       "attemptsMade"),
            "delayedUntil" = ${data.delayedUntil ?? null},
            "claimToken" = NULL,
            "updatedAt" = NOW()
        WHERE id = ${id}
          AND "claimToken" = ${claimToken}
          AND status = 'ACTIVE'
        RETURNING id
      `,
    );
    return rows.length === 1;
  }

  async recoverStaleActiveToDelayed(
    name: string,
    staleBefore: Date,
    delayedUntil: Date,
  ): Promise<QueueJobRow[]> {
    // Releasing the claim token is what fences the previous worker out: its
    // in-flight acknowledgment will no longer match (id, claimToken).
    return this.runUnrestrictedRows(
      () =>
        this.prisma.$queryRaw<QueueJobRow[]>`
        UPDATE "QueueJob"
        SET status = 'DELAYED',
            "attemptsMade" = "attemptsMade" + 1,
            "failedReason" = NULL,
            "delayedUntil" = ${delayedUntil},
            "claimToken" = NULL,
            "updatedAt" = NOW()
        WHERE name = ${name}
          AND status = 'ACTIVE'
          AND "processedAt" < ${staleBefore}
          AND "attemptsMade" < "maxAttempts"
        RETURNING *
      `,
    );
  }

  async recoverStaleActiveToFailed(
    name: string,
    staleBefore: Date,
  ): Promise<QueueJobRow[]> {
    return this.runUnrestrictedRows(
      () =>
        this.prisma.$queryRaw<QueueJobRow[]>`
        UPDATE "QueueJob"
        SET status = 'FAILED',
            "failedReason" = 'Recovered stale ACTIVE job after timeout',
            "claimToken" = NULL,
            "updatedAt" = NOW()
        WHERE name = ${name}
          AND status = 'ACTIVE'
          AND "processedAt" < ${staleBefore}
          AND "attemptsMade" >= "maxAttempts"
        RETURNING *
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

  /**
   * Append-only. There is no UPDATE or DELETE path for "QueueJobExecution" in
   * this class on purpose: the history must keep recording what workers actually
   * did even after the job row is removed by `removeJob`/`clear`.
   */
  async appendExecutions(
    records: Array<QueueJobExecutionRecord>,
  ): Promise<void> {
    if (records.length === 0) {
      return;
    }
    // RLS-BYPASS: background queue workers run without per-request clinic session
    await this.prisma.runUnrestricted(async () => {
      await this.prisma.queueJobExecution.createMany({ data: records });
    });
  }

  async listExecutions(jobId: string): Promise<Array<QueueJobExecutionRecord>> {
    // RLS-BYPASS: background queue workers run without per-request clinic session
    return this.prisma.runUnrestricted(async () =>
      this.prisma.queueJobExecution.findMany({
        where: { jobId },
        orderBy: { occurredAt: 'asc' },
      }),
    );
  }
}
