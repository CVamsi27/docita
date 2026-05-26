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
 * The store entry is intentionally a mutable object so the routing
 * extension can temporarily clear `tx` (set it to `null`) on the
 * nested call without losing the outer reference for sibling queries.
 */
export interface ActiveTxStore {
  tx: Tx | null;
}

export const activeTxStorage = new AsyncLocalStorage<ActiveTxStore>();

/**
 * Returns the currently active RLS-scoped transaction client, if any.
 * The extension uses this to decide whether to re-route a query.
 */
export function getActiveTx(): Tx | null {
  return activeTxStorage.getStore()?.tx ?? null;
}

/**
 * Runs `fn` with `tx` published as the active RLS-scoped transaction.
 * All Prisma model operations executed inside `fn` (and any AsyncLocal
 * descendant) will be re-routed through `tx` by the routing extension.
 */
export function runWithActiveTx<T>(tx: Tx, fn: () => Promise<T>): Promise<T> {
  return activeTxStorage.run({ tx }, fn);
}
