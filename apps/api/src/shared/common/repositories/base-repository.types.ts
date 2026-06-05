export interface PaginationOptions {
  limit?: number;
  cursor?: string;
  search?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  hasMore: boolean;
  nextCursor?: string;
  count?: number;
}

export interface WhereClauseOptions {
  clinicId: string;
  search?: string;
}

export type RepositoryModelDelegate = {
  findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
  findFirst: (args: Record<string, unknown>) => Promise<unknown | null>;
  create: (args: Record<string, unknown>) => Promise<unknown>;
  updateMany: (args: Record<string, unknown>) => Promise<{ count: number }>;
  deleteMany: (args: Record<string, unknown>) => Promise<{ count: number }>;
  count: (args: Record<string, unknown>) => Promise<number>;
};

export function isRepositoryModelDelegate(
  value: unknown,
): value is RepositoryModelDelegate {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return (
    'findMany' in value &&
    typeof value.findMany === 'function' &&
    'findFirst' in value &&
    typeof value.findFirst === 'function' &&
    'create' in value &&
    typeof value.create === 'function' &&
    'updateMany' in value &&
    typeof value.updateMany === 'function' &&
    'deleteMany' in value &&
    typeof value.deleteMany === 'function' &&
    'count' in value &&
    typeof value.count === 'function'
  );
}
