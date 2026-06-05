/**
 * Per-request query-count budget extension.
 *
 * Counts the number of Prisma queries within a single request context
 * (established by `RequestContextInterceptor` via ALS) and warns when
 * the count exceeds a configurable threshold. Catches N+1 patterns
 * before they reach production.
 *
 * SYSTEM_DESIGN_AND_PATTERNS.md §28.4 item 33.
 *
 * The extension never fails a request. The budget is observational.
 */

import { Prisma } from '@workspace/db';
import type { RequestQueryCounterContext } from '@/shared/common/context/request-context.store';

interface QueryBudgetLogger {
  warn(message: string): unknown;
}

export function makeQueryBudgetExtension(opts: {
  getContext: () => RequestQueryCounterContext | undefined;
  logger: QueryBudgetLogger;
}) {
  return Prisma.defineExtension({
    name: 'query-budget',
    query: {
      async $allOperations({ query, args, model, operation }) {
        const ctx = opts.getContext();
        if (ctx) {
          ctx.count += 1;
          if (ctx.count === ctx.budget + 1) {
            opts.logger.warn(
              `[query-budget] request exceeded budget of ${ctx.budget} queries (route=${ctx.route ?? 'unknown'}, requestId=${ctx.requestId ?? 'unknown'}, lastOp=${model}.${operation})`,
            );
          }
        }
        return query(args);
      },
    },
  });
}
