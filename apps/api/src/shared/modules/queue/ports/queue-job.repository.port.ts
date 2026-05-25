import type { Prisma } from '@workspace/db';

export interface QueueJobRow {
  id: string;
  name: string;
  data: Prisma.JsonValue;
  status: string;
  priority: number;
  attemptsMade: number;
  maxAttempts: number;
  failedReason: string | null;
  processedAt: Date | null;
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

  recoverStaleActiveToDelayed(
    name: string,
    staleBefore: Date,
    delayedUntil: Date,
  ): Promise<Array<{ id: string }>>;

  recoverStaleActiveToFailed(
    name: string,
    staleBefore: Date,
  ): Promise<Array<{ id: string }>>;

  findById(jobId: string): Promise<QueueJobRow | null>;

  countByStatus(
    name: string,
  ): Promise<Array<{ status: string; count: bigint }>>;
}

export const QUEUE_JOB_REPOSITORY_TOKEN = Symbol('QueueJobRepository');
