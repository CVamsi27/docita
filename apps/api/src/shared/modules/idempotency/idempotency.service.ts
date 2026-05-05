import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createHash } from 'crypto';
import { IDEMPOTENCY_TTL_SECONDS_DEFAULT } from './idempotency.constants';
import { IdempotencyRepository } from './idempotency.repository';

export interface CachedIdempotencyEntry {
  /**
   * sha-256 hex digest of the canonical-JSON-stringified request body. Used
   * to detect a buggy client that replays the same key with a different body.
   */
  bodyHash: string;
  response: unknown;
  /**
   * Epoch milliseconds at which the entry was first persisted. Returned for
   * diagnostic logging only.
   */
  createdAt: number;
}

/**
 * Storage layer for the idempotency interceptor. Persists state in Postgres so
 * idempotency holds across multiple API replicas.
 */
@Injectable()
export class IdempotencyService implements OnModuleInit {
  private readonly logger = new Logger(IdempotencyService.name);

  constructor(private readonly repository: IdempotencyRepository) {}

  onModuleInit(): void {
    if (process.env.NODE_ENV !== 'test') {
      this.logger.log(
        'HTTP idempotency is persisted to Postgres and is safe across API replicas.',
      );
    }
  }

  /**
   * Build a fully-scoped cache key. Tenant and user are folded in so a key
   * issued by one client can never collide with the same UUID issued by an
   * unrelated client. Method and path are folded in so the same key cannot
   * be replayed against a different endpoint.
   */
  buildKey(scope: {
    tenantId: string;
    userId: string;
    method: string;
    path: string;
    key: string;
  }): string {
    const { tenantId, userId, method, path, key } = scope;
    return `idempotency:v2:${tenantId}:${userId}:${method.toUpperCase()}:${path}:${key}`;
  }

  /**
   * Stable sha-256 over a canonical JSON encoding of the body. Object keys
   * are sorted recursively so that `{ a: 1, b: 2 }` and `{ b: 2, a: 1 }`
   * produce the same digest. Arrays are preserved in order. Returns the
   * empty-body sentinel for null/undefined.
   */
  hashBody(body: unknown): string {
    const canonical = canonicalize(body);
    return createHash('sha256').update(canonical).digest('hex');
  }

  async getCached(scopedKey: string): Promise<CachedIdempotencyEntry | null> {
    return this.repository.findActiveCompleted(scopedKey);
  }

  async saveCached(
    scopedKey: string,
    entry: CachedIdempotencyEntry,
    ttlSeconds: number = IDEMPOTENCY_TTL_SECONDS_DEFAULT,
  ): Promise<void> {
    await this.repository.completeProcessing(
      scopedKey,
      entry.bodyHash,
      entry.response,
      ttlSeconds,
    );
  }

  async isProcessing(scopedKey: string): Promise<boolean> {
    return this.repository.isKeyProcessing(scopedKey);
  }

  async markProcessing(scopedKey: string): Promise<void> {
    await this.repository.markProcessing(scopedKey);
  }

  async clearProcessing(scopedKey: string): Promise<void> {
    await this.repository.abortProcessing(scopedKey);
  }
}

function canonicalize(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(',')}]`;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const entries = Object.keys(obj)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(String(value));
}
