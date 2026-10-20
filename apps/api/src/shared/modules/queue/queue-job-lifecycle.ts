import { Logger } from '@nestjs/common';
import { QueueJobOutcome } from '@workspace/db';
import type { IClock } from '@/shared/common/ports/clock.port';
import type {
  QueueJobClaimTransition,
  QueueJobExecutionRecord,
  QueueJobRepository,
  QueueJobRow,
} from './ports/queue-job.repository.port';

/** Failure text kept in the execution history is truncated: it is a summary. */
const MAX_RECORDED_FAILURE_LENGTH = 500;

const STALE_ACTIVE_TIMEOUT_MS = 10 * 60 * 1000;
const RECOVERY_DELAY_MS = 30 * 1000;

/**
 * Claim acknowledgment, stale recovery and execution history for the
 * Postgres-backed queue.
 *
 * `PostgresQueueService.poll` decides what happens to a claim; this class owns
 * how that decision is persisted, so history and lease semantics can change
 * without touching the polling loop.
 */
export class QueueJobLifecycle {
  private readonly logger = new Logger(QueueJobLifecycle.name);

  constructor(
    private readonly queueJobs: QueueJobRepository,
    private readonly clock: IClock,
  ) {}

  /**
   * Appends one immutable outcome row.
   *
   * Best-effort on purpose: a failure to write history must not fail the job
   * transition that was already applied, or telemetry would be able to lose
   * queued work. A lost history row is visible as a missing outcome in the
   * dashboard; a lost job is not recoverable at all.
   */
  async recordExecution(
    row: QueueJobRow,
    outcome: {
      outcome: QueueJobOutcome;
      attempt: number;
      durationMs?: number;
      failedReason?: string;
    },
  ): Promise<void> {
    const record: QueueJobExecutionRecord = {
      jobId: row.id,
      queueName: row.name,
      outcome: outcome.outcome,
      attempt: Math.max(1, outcome.attempt),
      claimToken: row.claimToken ?? null,
      durationMs: outcome.durationMs ?? null,
      failedReason: outcome.failedReason
        ? outcome.failedReason.slice(0, MAX_RECORDED_FAILURE_LENGTH)
        : null,
      occurredAt: this.clock.now(),
    };

    try {
      await this.queueJobs.appendExecutions([record]);
    } catch (error) {
      this.logger.warn(
        `Could not record execution outcome ${outcome.outcome} for job ${row.id} (${row.name}): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Applies a transition out of ACTIVE, gated on this worker's claim token.
   *
   * Returns false when the claim was already lost (the job was reclaimed by
   * stale recovery and may be running under a new owner). A lost claim is not
   * an error: the correct response is to abandon the acknowledgment, because
   * the new owner is responsible for the job's outcome now. Without this gate,
   * a slow worker overwrites the state of a job another worker already owns.
   */
  async acknowledgeClaim(
    row: QueueJobRow,
    transition: QueueJobClaimTransition,
  ): Promise<boolean> {
    const claimToken = row.claimToken ?? null;
    if (!claimToken) {
      this.logger.warn(
        `Job ${row.id} (${row.name}) completed without a claim token; skipping the ${transition.status} acknowledgment. Stale-recovery must have released this claim.`,
      );
      return false;
    }

    const applied = await this.queueJobs.applyClaimTransition(
      row.id,
      claimToken,
      transition,
    );
    if (!applied) {
      this.logger.warn(
        `Job ${row.id} (${row.name}) lost its claim before the ${transition.status} acknowledgment; the job has been reclaimed and its outcome belongs to the new owner.`,
      );
      // A lost claim is itself an outcome worth keeping: it is the evidence that
      // a worker did work whose result was correctly discarded, and it is how an
      // operator spots a queue where leases expire faster than jobs run.
      await this.recordExecution(row, {
        outcome: QueueJobOutcome.CLAIM_LOST,
        attempt: row.attemptsMade + 1,
        failedReason: `Claim lost before ${transition.status} acknowledgment`,
      });
    }
    return applied;
  }

  async recoverStaleActiveJobs(name: string): Promise<void> {
    const nowMs = this.clock.now().getTime();
    const staleBefore = new Date(nowMs - STALE_ACTIVE_TIMEOUT_MS);
    const delayedUntil = new Date(nowMs + RECOVERY_DELAY_MS);

    const delayedRows = await this.queueJobs.recoverStaleActiveToDelayed(
      name,
      staleBefore,
      delayedUntil,
    );

    const failedRows = await this.queueJobs.recoverStaleActiveToFailed(
      name,
      staleBefore,
    );

    if (delayedRows.length > 0 || failedRows.length > 0) {
      this.logger.warn(
        `Recovered stale ACTIVE jobs for ${name}: delayed=${delayedRows.length}, failed=${failedRows.length}`,
      );
    }

    // A stale recovery resets attemptsMade and moves the job on without any
    // worker acknowledging it, so without a history row the retry it caused is
    // invisible in the outcome stream.
    await this.recordStaleRecoveries(name, [
      ...delayedRows.map((row) => ({
        row,
        reason: 'Recovered stale ACTIVE job: re-delayed',
      })),
      ...failedRows.map((row) => ({
        row,
        reason: 'Recovered stale ACTIVE job: attempts exhausted',
      })),
    ]);
  }

  private async recordStaleRecoveries(
    name: string,
    recovered: Array<{ row: QueueJobRow; reason: string }>,
  ): Promise<void> {
    if (recovered.length === 0) {
      return;
    }
    try {
      await this.queueJobs.appendExecutions(
        recovered.map(({ row, reason }) => ({
          jobId: row.id,
          queueName: name,
          outcome: QueueJobOutcome.STALE_RECOVERED,
          attempt: Math.max(1, row.attemptsMade),
          claimToken: null,
          durationMs: null,
          failedReason: reason,
          occurredAt: this.clock.now(),
        })),
      );
    } catch (error) {
      this.logger.warn(
        `Could not record stale recovery history for ${name}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
