/**
 * Cursor-based pagination helper for Prisma queries
 *
 * Benefits over offset pagination:
 * - O(1) performance regardless of page depth (offset pagination is O(n))
 * - Consistent results even when data is being inserted/deleted
 * - Scales to millions of records without performance degradation
 *
 * Usage:
 * ```typescript
 * const result = await paginateWithCursor({
 *   model: prisma.patient,
 *   cursor,
 *   limit: 50,
 *   where: { clinicId: 'abc123' },
 *   orderBy: { createdAt: 'desc' },
 *   select: PATIENT_LIST_SELECT,
 * });
 * ```
 */

export interface CursorPaginationOptions<T = any> {
  /** Prisma model to query */
  model: any;

  /** Cursor ID from previous page (undefined for first page) */
  cursor?: string;

  /** Number of items per page (default: 50, max: 100) */
  limit?: number;

  /** Prisma where clause */
  where?: any;

  /** Prisma orderBy clause */
  orderBy?: any;

  /** Prisma select clause */
  select?: any;

  /** Prisma include clause (use select instead for better performance) */
  include?: any;
}

export interface CursorPaginationResult<T> {
  /** Array of items for current page */
  items: T[];

  /** Cursor for next page (undefined if no more pages) */
  nextCursor: string | undefined;

  /** Whether there are more pages */
  hasMore: boolean;

  /** Number of items returned */
  count: number;
}

/**
 * Execute cursor-based pagination query
 *
 * @example
 * ```typescript
 * // First page
 * const page1 = await paginateWithCursor({
 *   model: prisma.patient,
 *   limit: 50,
 *   where: { clinicId: 'abc123' },
 *   orderBy: { createdAt: 'desc' },
 *   select: PATIENT_LIST_SELECT,
 * });
 *
 * // Next page
 * const page2 = await paginateWithCursor({
 *   model: prisma.patient,
 *   cursor: page1.nextCursor,
 *   limit: 50,
 *   where: { clinicId: 'abc123' },
 *   orderBy: { createdAt: 'desc' },
 *   select: PATIENT_LIST_SELECT,
 * });
 * ```
 */
export async function paginateWithCursor<T = any>(
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

  const queryOptions: any = {
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
  const nextCursor =
    hasMore && paginatedItems.length > 0
      ? paginatedItems[paginatedItems.length - 1].id
      : undefined;

  return {
    items: paginatedItems,
    nextCursor,
    hasMore,
    count: paginatedItems.length,
  };
}

/**
 * Helper to create pagination metadata for API responses
 */
export interface PaginationMeta {
  cursor: string | undefined;
  hasMore: boolean;
  count: number;
  limit: number;
}

export function createPaginationMeta(
  result: CursorPaginationResult<any>,
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
 *
 * @deprecated Use paginateWithCursor instead for better performance on large datasets
 */
export interface OffsetPaginationOptions<T = any> {
  model: any;
  page?: number;
  limit?: number;
  where?: any;
  orderBy?: any;
  select?: any;
  include?: any;
}

export interface OffsetPaginationResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export async function paginateWithOffset<T = any>(
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

  const [items, total] = await Promise.all([
    model.findMany({
      skip,
      take: safeLimit,
      where,
      orderBy,
      ...(select ? { select } : {}),
      ...(include ? { include } : {}),
    }),
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
