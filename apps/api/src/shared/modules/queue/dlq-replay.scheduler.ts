/**
 * Auto-replay DLQ jobs whose last error is classified as transient
 * (network, timeout, 5xx upstream). Manual replay via
 * `DlqController` (`POST /internal/dlq/retry`) remains the canonical
 * path for permanent failures and one-shot retries.
 *
 * Wiring (TODO — see SYSTEM_DESIGN_AND_PATTERNS.md §28.5 item 35):
 *   - Register this provider in `queue.worker.module.ts`.
 *   - Add `@Cron` schedule (every 5 minutes).
 *   - Wire `PostgresQueueService.listDeadJobs(...)` filter on transient
 *     error kinds and call `requeue(job.id)` with capped attempts.
 *
 * This scaffold ships as inert (the scheduler is not auto-instantiated
 * until added to a module). That avoids surprise replays in production
 * before the transient-error classifier is reviewed.
 */
import { Inject, Injectable } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { PostgresQueueService } from '@/shared/modules/queue/postgres-queue.service';
import type { IQueueProvider } from '@/shared/modules/queue/queue.interface';

export type TransientErrorKind =
  | 'network'
  | 'timeout'
  | 'upstream_5xx'
  | 'rate_limited';

export const TRANSIENT_ERROR_KINDS = new Set<TransientErrorKind>([
  'network',
  'timeout',
  'upstream_5xx',
  'rate_limited',
]);

export const DLQ_REPLAY_DEFAULT_ATTEMPTS = 3;

@Injectable()
export class DlqReplayScheduler {
  constructor(
    @Inject('queue') private readonly queue: IQueueProvider,
    private readonly logger: Logger,
  ) {}

  /**
   * Pure logic — given a list of dead jobs with classified errors,
   * returns the subset that should be replayed. Decoupled from
   * Nest's scheduler so unit tests can run without the framework.
   */
  classifyForReplay<
    TJob extends { id: string; lastErrorKind?: string; attempts?: number },
  >(
    jobs: readonly TJob[],
    maxAttempts: number = DLQ_REPLAY_DEFAULT_ATTEMPTS,
  ): TJob[] {
    const kinds: ReadonlySet<string> = TRANSIENT_ERROR_KINDS;
    return jobs.filter((job) => {
      if (!kinds.has(job.lastErrorKind ?? '')) return false;
      const attempts = job.attempts ?? 0;
      return attempts < maxAttempts;
    });
  }

  /**
   * Intentional no-op until wired. See file-header TODO.
   * Logs a warning if invoked accidentally so we notice during early
   * runtime testing rather than silently failing.
   */
  async tick(): Promise<void> {
    if (!(this.queue instanceof PostgresQueueService)) {
      return;
    }
    this.logger.warn(
      'DlqReplayScheduler.tick called but auto-replay wiring is pending; see file header.',
    );
  }
}
