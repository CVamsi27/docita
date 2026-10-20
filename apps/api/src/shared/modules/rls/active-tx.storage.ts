import { AsyncLocalStorage } from 'async_hooks';
import { Prisma } from '@workspace/db';

type Tx = Prisma.TransactionClient;

/**
 * Stores the request-scoped Prisma transaction that has been opened with
 * tenant-isolation GUCs set (see `applyRlsScope`). When this store is
 * populated, the `rls-routing` Prisma extension re-issues every Prisma
 * model operation against `tx` so the query runs on the same connection
 * the GUC was set on. Without this, `SET LOCAL` would only apply to `tx`
 * while the rest of the application unwittingly queries through another
 * pool connection.
 *
 * Detachment creates a child ALS scope rather than mutating the shared
 * request store, so concurrent sibling queries retain their transaction.
 */
interface ActiveTxStore {
  readonly tx: Tx | null;
}

export const activeTxStorage = new AsyncLocalStorage<ActiveTxStore>();

/**
 * Runs `fn` with `tx` published as the active RLS-scoped transaction.
 * All Prisma model operations executed inside `fn` (and any AsyncLocal
 * descendant) will be re-routed through `tx` by the routing extension.
 */
export function runWithActiveTx<T>(tx: Tx, fn: () => Promise<T>): Promise<T> {
  return activeTxStorage.run({ tx }, fn);
}

/**
 * Runs `fn` without re-routing Prisma calls through the request-scoped RLS tx.
 * Use at background boundaries that outlive TenantContextInterceptor's
 * interactive transaction. Awaited work must retain the live transaction.
 */
export async function runOutsideActiveTx<T>(fn: () => Promise<T>): Promise<T> {
  const store = activeTxStorage.getStore();
  if (!store?.tx) return fn();
  return activeTxStorage.run({ tx: null }, fn);
}
