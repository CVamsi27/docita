/**
 * Cursor-Based Pagination Service
 * Implements efficient cursor-based pagination for large datasets
 * Supports sorting and filtering without offset performance issues
 */

import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

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

@Injectable()
export class CursorPaginationService {
  private readonly logger = new Logger(CursorPaginationService.name);

  /**
   * Encode cursor from data point
   */
  encodeCursor(data: Record<string, any>): string {
    const json = JSON.stringify(data);
    return Buffer.from(json).toString('base64');
  }

  /**
   * Decode cursor to data point
   */
  decodeCursor(cursor?: string): Record<string, any> | null {
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

  /**
   * Build WHERE clause for cursor-based pagination
   */
  buildCursorWhereClause(
    decodedCursor: Record<string, any> | null,
    sortBy: string,
    sortOrder: 'asc' | 'desc',
    direction: 'next' | 'prev',
  ): any {
    if (!decodedCursor) return {};

    const value = decodedCursor[sortBy];
    if (value === undefined) return {};

    // For next page (ascending), get items > cursor value
    // For next page (descending), get items < cursor value
    if (direction === 'next') {
      return sortOrder === 'asc'
        ? { [sortBy]: { gt: value } }
        : { [sortBy]: { lt: value } };
    }

    // For previous page, reverse the logic
    return sortOrder === 'asc'
      ? { [sortBy]: { lt: value } }
      : { [sortBy]: { gt: value } };
  }

  /**
   * Build Prisma skip/take for cursor pagination
   */
  buildSkipTake(limit: number): { skip: number; take: number } {
    return {
      skip: 0,
      take: limit + 1, // Fetch one extra to determine if there are more pages
    };
  }

  /**
   * Format paginated response
   */
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
            [sortBy]: (pageItems[pageItems.length - 1] as any)[sortBy],
          })
        : undefined;

    const previousCursor =
      direction === 'next' && pageItems.length > 0
        ? this.encodeCursor({ [sortBy]: (pageItems[0] as any)[sortBy] })
        : undefined;

    return {
      items: pageItems,
      nextCursor: direction === 'next' ? nextCursor : undefined,
      previousCursor: direction === 'prev' ? previousCursor : undefined,
      hasNextPage: hasMore && direction === 'next',
      hasPreviousPage: direction === 'prev',
    };
  }

  /**
   * Get documentation for cursor pagination
   */
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
