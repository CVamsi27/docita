import { Injectable, Logger } from '@nestjs/common';
import * as _crypto from 'crypto';

export interface CursorPage<T> {
  items: T[];
  nextCursor?: string;
  previousCursor?: string;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  totalItems?: number;
}

export interface CursorPaginationOptions {
  limit: number;
  cursor?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeTotal?: boolean;
}

type CursorPayload = Record<string, unknown>;

@Injectable()
export class CursorPaginationService {
  private readonly logger = new Logger(CursorPaginationService.name);

  encodeCursor(data: CursorPayload): string {
    const json = JSON.stringify(data);
    return Buffer.from(json).toString('base64');
  }

  decodeCursor(cursor?: string): CursorPayload | null {
    if (!cursor) return null;

    try {
      const json = Buffer.from(cursor, 'base64').toString('utf8');
      return JSON.parse(json);
    } catch (error) {
      this.logger.warn(
        `Invalid cursor: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }

  private getSortValue(item: unknown, sortBy: string): unknown {
    if (!item || typeof item !== 'object') {
      return undefined;
    }

    return (item as CursorPayload)[sortBy];
  }

  buildCursorWhereClause(
    decodedCursor: Record<string, unknown> | null,
    sortBy: string,
    sortOrder: 'asc' | 'desc',
    direction: 'next' | 'prev',
  ): Record<string, unknown> {
    if (!decodedCursor) return {};

    const value = decodedCursor[sortBy];
    if (value === undefined) return {};

    if (direction === 'next') {
      return sortOrder === 'asc'
        ? { [sortBy]: { gt: value } }
        : { [sortBy]: { lt: value } };
    }

    return sortOrder === 'asc'
      ? { [sortBy]: { lt: value } }
      : { [sortBy]: { gt: value } };
  }

  buildSkipTake(limit: number): { skip: number; take: number } {
    return {
      skip: 0,
      take: limit + 1,
    };
  }

  formatPage<T>(
    items: T[],
    limit: number,
    sortBy: string,
    direction: 'next' | 'prev' = 'next',
  ): CursorPage<T> {
    const hasMore = items.length > limit;
    const pageItems = hasMore ? items.slice(0, limit) : items;

    const nextCursor =
      hasMore && pageItems.length > 0
        ? this.encodeCursor({
            [sortBy]: this.getSortValue(
              pageItems[pageItems.length - 1],
              sortBy,
            ),
          })
        : undefined;

    const previousCursor =
      direction === 'next' && pageItems.length > 0
        ? this.encodeCursor({
            [sortBy]: this.getSortValue(pageItems[0], sortBy),
          })
        : undefined;

    return {
      items: pageItems,
      nextCursor: direction === 'next' ? nextCursor : undefined,
      previousCursor: direction === 'prev' ? previousCursor : undefined,
      hasNextPage: hasMore && direction === 'next',
      hasPreviousPage: direction === 'prev',
    };
  }

  getDocumentation(): string {
    return `
## Cursor-Based Pagination Guide

### Parameters
- **limit**: Number of items per page (1-100, default 20)
- **cursor**: Base64-encoded cursor for pagination
- **sortBy**: Field to sort by (must be indexed)
- **sortOrder**: 'asc' or 'desc' (default 'asc')

### Response
\`\`\`json
{
  "items": [...],
  "nextCursor": "base64-encoded-cursor",
  "previousCursor": "base64-encoded-cursor",
  "hasNextPage": true,
  "hasPreviousPage": false
}
\`\`\`

### Example Usage
1. First page: GET /api/patients?limit=20
2. Next page: GET /api/patients?limit=20&cursor=<nextCursor>&sortBy=id
3. Previous page: GET /api/patients?limit=20&cursor=<previousCursor>&sortBy=id&sortOrder=desc

### Advantages
- Constant query performance (O(1) independent of page number)
- Natural for real-time data (new items don't shift pagination)
- Works efficiently with database indexes
- No large OFFSET queries
`;
  }
}
