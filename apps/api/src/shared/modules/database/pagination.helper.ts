/**
 * Cursor-based pagination helper for Prisma queries
 */

import {
  CursorPaginationResult,
  OffsetPaginationResult,
  PaginationMeta,
  PrismaQuery,
} from '@workspace/types';

// Generic interface for Prisma Delegate (compatible with any Prisma model delegate)
// We use generics with optional args to maintain compatibility across Prisma model delegates
export interface PrismaModelDelegate<T> {
  findMany: (args?: Record<string, unknown>) => Promise<T[]>;
  count: (args?: { where?: Record<string, unknown> }) => Promise<number>;
}

export interface CursorPaginationOptions<T> {
  /** Prisma model to query */
  model: PrismaModelDelegate<T>;

  /** Cursor ID from previous page (undefined for first page) */
  cursor?: string;

  /** Number of items per page (default: 50, max: 100) */
  limit?: number;

  /** Prisma where clause */
  where?: PrismaQuery;

  /** Prisma orderBy clause */
  orderBy?: PrismaQuery;

  /** Prisma select clause */
  select?: PrismaQuery;

  /** Prisma include clause (use select instead for better performance) */
  include?: PrismaQuery;
}

/**
 * Execute cursor-based pagination query
 */
export async function paginateWithCursor<T>(
  options: CursorPaginationOptions<T>,
): Promise<CursorPaginationResult<T>> {
  const {
    model,
    cursor,
    limit = 50,
    where = {},
    orderBy = {},
    select,
    include,
  } = options;

  // Enforce max limit to prevent abuse
  const safeLimit = Math.min(limit, 100);

  // Fetch one extra item to determine if there are more pages
  const takeCount = safeLimit + 1;

  const queryOptions: {
    take: number;
    where: PrismaQuery;
    orderBy: PrismaQuery;
    cursor?: { id: string };
    skip?: number;
    select?: PrismaQuery;
    include?: PrismaQuery;
  } = {
    take: takeCount,
    where,
    orderBy,
  };

  // Add cursor if provided (not first page)
  if (cursor) {
    queryOptions.cursor = { id: cursor };
    queryOptions.skip = 1; // Skip the cursor item itself
  }

  // Add select or include (prefer select for performance)
  if (select) {
    queryOptions.select = select;
  } else if (include) {
    queryOptions.include = include;
  }

  // Execute query
  const items = await model.findMany(queryOptions);

  // Determine if there are more pages
  const hasMore = items.length > safeLimit;

  // Remove extra item if present
  const paginatedItems = hasMore ? items.slice(0, safeLimit) : items;

  // Get next cursor (ID of last item)
  // Casting to any to access 'id' without generic constraint on T
  const lastItem =
    paginatedItems.length > 0
      ? (paginatedItems[paginatedItems.length - 1] as unknown as {
          id?: unknown;
        })
      : undefined;
  const nextCursor =
    hasMore && lastItem && typeof lastItem.id === 'string'
      ? lastItem.id
      : undefined;

  return {
    items: paginatedItems,
    nextCursor,
    hasMore,
    count: paginatedItems.length,
  };
}

export type { PaginationMeta };

export function createPaginationMeta(
  result: CursorPaginationResult<unknown>,
  limit: number,
): PaginationMeta {
  return {
    cursor: result.nextCursor,
    hasMore: result.hasMore,
    count: result.count,
    limit,
  };
}

/**
 * Offset-based pagination (legacy, use cursor pagination for better performance)
 */
export interface OffsetPaginationOptions<T> {
  model: PrismaModelDelegate<T>;
  page?: number;
  limit?: number;
  where?: PrismaQuery;
  orderBy?: PrismaQuery;
  select?: PrismaQuery;
  include?: PrismaQuery;
}

export async function paginateWithOffset<T>(
  options: OffsetPaginationOptions<T>,
): Promise<OffsetPaginationResult<T>> {
  const {
    model,
    page = 1,
    limit = 50,
    where = {},
    orderBy = {},
    select,
    include,
  } = options;

  const safeLimit = Math.min(limit, 100);
  const safePage = Math.max(page, 1);
  const skip = (safePage - 1) * safeLimit;

  // Typed query options
  const findManyOptions: {
    skip: number;
    take: number;
    where: PrismaQuery;
    orderBy: PrismaQuery;
    select?: PrismaQuery;
    include?: PrismaQuery;
  } = {
    skip,
    take: safeLimit,
    where,
    orderBy,
  };

  if (select) findManyOptions.select = select;
  if (include) findManyOptions.include = include;

  const [items, total] = await Promise.all([
    model.findMany(findManyOptions),
    model.count({ where }),
  ]);

  const totalPages = Math.ceil(total / safeLimit);

  return {
    items,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages,
    hasMore: safePage < totalPages,
  };
}
