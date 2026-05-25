// check-as-cast-density: allow-file — queue job payload generic erasure at handler registry
import type {
  QueueJob,
  QueueJobData,
  QueueJobHandler,
} from './queue.interface';

/** Single boundary when erasing queue job payload generics at the handler registry. */
export function coerceQueueJob<T extends QueueJobData>(
  job: QueueJob<QueueJobData>,
): QueueJob<T> {
  return { ...job, data: job.data as T };
}

export function bindQueueJobHandler<T extends QueueJobData>(
  handler: QueueJobHandler<T>,
): QueueJobHandler {
  return (job) => handler(coerceQueueJob<T>(job));
}
