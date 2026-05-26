/**
 * Per-request query-count budget extension.
 *
 * Counts the number of Prisma queries within a single request context
 * (established by `TenantContextInterceptor` via ALS) and warns when
 * the count exceeds a configurable threshold. Catches N+1 patterns
 * before they reach production.
 *
 * SYSTEM_DESIGN_AND_PATTERNS.md §28.4 item 33.
 *
 * Activation:
 *   - Always counts in non-production. Logs warnings above `QUERY_BUDGET_PER_REQUEST`.
 *   - In production, only emits when `QUERY_BUDGET_WARN_PROD=true`.
 *   - Never fails the request. The budget is observational.
 */

import { Prisma } from '@workspace/db';
import type { Logger } from 'nestjs-pino';

/**
 * Per-request soft cap. Tune based on observed p95 query count in
 * each endpoint family; the current value is a conservative starting
 * point.
 */
export const DEFAULT_QUERY_BUDGET_PER_REQUEST = 50;

export interface RequestQueryCounterContext {
  count: number;
  budget: number;
  requestId?: string;
  route?: string;
}

export function makeQueryBudgetExtension(opts: {
  getContext: () => RequestQueryCounterContext | undefined;
  logger: Logger;
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
