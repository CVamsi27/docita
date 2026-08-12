// check-as-cast-density: allow-file — canonical seam for queue payload generic
// erasure at the handler registry: `process<T>(name, handler)` stores the
// handler erased (`QueueJobHandler`) and `coerceQueueJob<T>` re-narrows the
// payload at dispatch. The `as T` is the single sanctioned last-mile
// assertion of the name↔payload-type binding — `QueueJobData`
// (`Prisma.InputJsonObject`) is not assignable to its generic subtype `T`
// without it (verified: `tsc` errors TS2322 on the plain assignment), and a
// runtime validation cannot target an unknown generic `T`. Re-typing the
// handlers map (`Map<string, QueueJobHandler<QueueJobData>>`) only relocates
// the cast to the two provider files with no net gain. Same class as the
// `to-prisma-input-json-value` codec seam (P5.2b).
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
