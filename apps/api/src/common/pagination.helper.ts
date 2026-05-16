import {
  CursorPaginationResult,
  OffsetPaginationResult,
  PaginationMeta,
  PrismaQuery,
} from '@workspace/types';

export interface PrismaModelDelegate<T> {
  findMany: (args?: Record<string, unknown>) => Promise<T[]>;
  count: (args?: { where?: Record<string, unknown> }) => Promise<number>;
}

export interface CursorPaginationOptions<T> {
  model: PrismaModelDelegate<T>;

  cursor?: string;

  limit?: number;

  where?: PrismaQuery;

  orderBy?: PrismaQuery;

  select?: PrismaQuery;

  include?: PrismaQuery;
}

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

  const safeLimit = Math.min(limit, 100);

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

  if (cursor) {
    queryOptions.cursor = { id: cursor };
    queryOptions.skip = 1;
  }

  if (select) {
    queryOptions.select = select;
  } else if (include) {
    queryOptions.include = include;
  }

  const items = await model.findMany(queryOptions);

  const hasMore = items.length > safeLimit;

  const paginatedItems = hasMore ? items.slice(0, safeLimit) : items;

  const lastItem =
    paginatedItems.length > 0
      ? paginatedItems[paginatedItems.length - 1]
      : undefined;
  const nextCursor = hasMore ? extractCursorId(lastItem) : undefined;

  return {
    items: paginatedItems,
    nextCursor,
    hasMore,
    count: paginatedItems.length,
  };
}

export type { PaginationMeta };

function extractCursorId(item: unknown): string | undefined {
  if (!item || typeof item !== 'object') {
    return undefined;
  }

  const id = (item as { id?: unknown }).id;
  return typeof id === 'string' ? id : undefined;
}

function createPaginationMeta(
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

export interface OffsetPaginationOptions<T> {
  model: PrismaModelDelegate<T>;
  page?: number;
  limit?: number;
  where?: PrismaQuery;
  orderBy?: PrismaQuery;
  select?: PrismaQuery;
  include?: PrismaQuery;
}

async function paginateWithOffset<T>(
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
