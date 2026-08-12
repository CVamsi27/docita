import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Audit FL8 (2026-05-23): AsyncLocalStorage carrier for the correlation id
 * (a.k.a. x-correlation-id / x-request-id) attached to the inbound HTTP
 * request. Anything that runs inside the request lifecycle — including
 * EventEmitter2 `@OnEvent` handlers triggered synchronously from a request
 * path — can read the id via the stored context without having to be
 * passed the Express `Request`.
 *
 * Async work that *outlives* the request (scheduled jobs, cron, worker
 * queue consumers) does not see this store. For those paths, the correlation
 * id must be carried in the job payload itself; this store is only the
 * HTTP-scoped half of the bridge.
 *
 * Stored value is intentionally minimal — just the id. If more request
 * context is needed downstream, add fields here rather than threading a
 * new ALS instance.
 */
interface RequestContext {
  readonly correlationId: string;
  readonly queryCounter: RequestQueryCounterContext;
}

const store = new AsyncLocalStorage<RequestContext>();

export const DEFAULT_QUERY_BUDGET_PER_REQUEST = 50;

export interface RequestQueryCounterContext {
  count: number;
  budget: number;
  requestId?: string;
  route?: string;
}

/**
 * Run `fn` inside a request-scoped context. Intended for callers that own
 * the request boundary (interceptors, middleware). Application code should
 * not call this directly.
 */
export function runWithRequestContext<T>(
  context: RequestContext,
  fn: () => T,
): T {
  return store.run(context, fn);
}

export function getRequestQueryCounterContext():
  | RequestQueryCounterContext
  | undefined {
  return store.getStore()?.queryCounter;
}
