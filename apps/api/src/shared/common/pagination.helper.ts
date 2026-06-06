import { CursorPaginationResult, PrismaQuery } from '@workspace/types';
import { isRecord } from '@workspace/utils';

interface PrismaModelDelegate<T> {
  findMany: (args?: Record<string, unknown>) => Promise<T[]>;
  count: (args?: { where?: Record<string, unknown> }) => Promise<number>;
}

interface CursorPaginationOptions<T> {
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

function extractCursorId(item: unknown): string | undefined {
  if (!isRecord(item)) {
    return undefined;
  }

  const id = item.id;
  return typeof id === 'string' ? id : undefined;
}
