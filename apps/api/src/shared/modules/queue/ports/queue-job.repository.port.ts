import type { Prisma, QueueJobOutcome } from '@workspace/db';

/**
 * One immutable execution outcome for a queue job.
 *
 * QueueJob.status is current state and is overwritten by every retry, so it
 * cannot answer "did this job fail before it succeeded" or "whose claim was
 * lost". These rows are append-only and survive job deletion, which is why the
 * repository owns them rather than the queue service writing Prisma directly.
 */
export interface QueueJobExecutionRecord {
  jobId: string;
  queueName: string;
  outcome: QueueJobOutcome;
  attempt: number;
  claimToken?: string | null;
  durationMs?: number | null;
  failedReason?: string | null;
  occurredAt: Date;
}

export interface QueueJobRow {
  id: string;
  name: string;
  data: Prisma.JsonValue;
  status: string;
  priority: number;
  attemptsMade: number;
  maxAttempts: number;
  replayCount: number;
  lastReplayedAt: Date | null;
  failedReason: string | null;
  processedAt: Date | null;
  claimToken?: string | null;
  delayedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
  idempotencyKey?: string | null;
  completedAt?: Date | null;
}

export interface QueueJobRepository {
  findRecentCompletedByIdempotency(
    name: string,
    idempotencyKey: string,
    completedSince: Date,
  ): Promise<QueueJobRow | null>;

  claimNextWaitingJob(name: string): Promise<QueueJobRow[]>;

  /**
   * Returns the recovered rows, not just ids: a stale recovery resets
   * attemptsMade and moves the job on, so the execution history needs the real
   * job id and attempt number to stay joinable.
   */
  recoverStaleActiveToDelayed(
    name: string,
    staleBefore: Date,
    delayedUntil: Date,
  ): Promise<QueueJobRow[]>;

  recoverStaleActiveToFailed(
    name: string,
    staleBefore: Date,
  ): Promise<QueueJobRow[]>;

  /**
   * Applies a claim-owner-gated transition out of ACTIVE.
   *
   * The update matches on `(id, claimToken)`, so a worker whose lease was
   * already reclaimed by stale recovery writes nothing instead of clobbering
   * the job's new owner. `returns false` means the claim was lost, which the
   * caller must treat as "someone else owns this job now" rather than as an
   * error to retry against.
   */
  applyClaimTransition(
    id: string,
    claimToken: string,
    data: QueueJobClaimTransition,
  ): Promise<boolean>;

  findById(jobId: string): Promise<QueueJobRow | null>;

  countByStatus(
    name: string,
  ): Promise<Array<{ status: string; count: bigint }>>;

  /**
   * Appends execution outcomes. Must never update or delete existing rows: the
   * history is the record, so a replay or a corrected state cannot rewrite what
   * a worker actually did.
   *
   * Best-effort by design. A history write that fails must not fail the job
   * outcome it describes, or telemetry would be able to lose queued work.
   */
  appendExecutions(records: Array<QueueJobExecutionRecord>): Promise<void>;

  listExecutions(jobId: string): Promise<Array<QueueJobExecutionRecord>>;
}

/**
 * The fields a worker may set when acknowledging its own claim. Kept narrow so
 * an acknowledgment can never rewrite scheduling or attempt bookkeeping that
 * belongs to the claim protocol.
 */
export interface QueueJobClaimTransition {
  status: 'COMPLETED' | 'DELAYED' | 'DEAD_LETTERED' | 'FAILED';
  completedAt?: Date | null;
  deadLetteredAt?: Date | null;
  failedReason?: string | null;
  attemptsMade?: number;
  delayedUntil?: Date | null;
}

export const QUEUE_JOB_REPOSITORY_TOKEN = Symbol('QueueJobRepository');
