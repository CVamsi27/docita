/**
 * Auto-replay DLQ jobs whose last error is classified as transient
 * (network, timeout, 5xx upstream). Manual replay via
 * `DlqController` (`POST /internal/dlq/retry`) remains the canonical
 * path for permanent failures and one-shot retries.
 *
 * This policy helper stays inert unless a worker module explicitly wires
 * automatic replay. That avoids surprise production replays before transient
 * error classification is reviewed for each queue.
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
   * Manual DLQ replay remains canonical. If this method is invoked without
   * explicit worker wiring, warn so runtime tests catch the inert path.
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
