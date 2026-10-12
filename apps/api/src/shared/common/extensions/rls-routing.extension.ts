// check-as-cast-density: allow-file — Prisma.TransactionClient has no dynamic-key accessor; `as unknown as Record<...>` is the canonical escape hatch to index model delegates at runtime.
import { Prisma } from '@workspace/db';
import { activeTxStorage } from '@/shared/modules/rls/active-tx.storage';

interface RoutableOperation<T> {
  model: string;
  operation: string;
  args: unknown;
  query: (args: unknown) => Promise<T>;
}

/**
 * Pure routing core. Extracted from the Prisma extension factory so it
 * can be unit-tested without standing up a real Prisma runtime.
 *
 * Contract:
 * - If `activeTxStorage` has no `tx` published, returns `query(args)`.
 * - Otherwise, looks up `tx[modelKey][operation]` and invokes it with
 *   `args`, while temporarily clearing the active tx so the nested call
 *   (which goes through the same extension chain in production) takes
 *   the pass-through branch.
 * - If the tx is missing the model/op (e.g. an unknown model — should
 *   not occur in practice), falls back to `query(args)`.
 * - Uses a child ALS scope so sibling operations retain the request tx.
 */
export async function routeOperationThroughActiveTx<T>(
  input: RoutableOperation<T>,
): Promise<T> {
  const { model, operation, args, query } = input;
  const store = activeTxStorage.getStore();
  if (!store || !store.tx) return query(args);
  const tx = store.tx;

  const modelKey = model.charAt(0).toLowerCase() + model.slice(1);
  const txClient = tx as unknown as Record<
    string,
    Record<string, (input: unknown) => Promise<unknown>>
  >;
  const delegate = txClient[modelKey];
  if (!delegate || typeof delegate[operation] !== 'function')
    return query(args);

  return activeTxStorage.run({ tx: null }, async () => {
    // The delegate mirrors the original query's return shape (both are the
    // same Prisma model operation, just executed on the RLS-scoped client),
    // so the await result narrows back to T without an escape hatch.
    return (await delegate[operation](args)) as T;
  });
}

/**
 * Re-routes Prisma model operations through the currently active RLS-scoped
 * transaction (`activeTxStorage`). Without this routing, `SET LOCAL` issued
 * on the per-request transaction in `TenantContextInterceptor` would apply
 * only to that `tx` client, while application code running through the
 * outer `PrismaService` would borrow a *different* pool connection and
 * therefore evaluate the `tenant_isolation` policy against an empty
 * `app.current_clinic_id` setting — i.e. the GUC effectively wouldn't apply.
 *
 * Mechanics:
 * - When `activeTxStorage` has a `tx`, the extension forwards the operation
 *   to `tx[modelKey][operation](args)` so the actual query runs on the
 *   connection that holds the `SET LOCAL` values.
 * - The re-issued call goes through the same extension chain, so to avoid
 *   infinite recursion the delegate runs in a child scope with `tx: null`;
 *   nested invocations pass through while concurrent siblings still route.
 *
 * The extension is a no-op when no active tx is published, which is the
 * normal mode for background workers, auth bootstrap, and any code that
 * deliberately opts out via `runUnrestricted` or by skipping the
 * interceptor.
 */
export const rlsRoutingExtension = Prisma.defineExtension({
  name: 'rls-routing',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        return routeOperationThroughActiveTx({ model, operation, args, query });
      },
    },
  },
});
