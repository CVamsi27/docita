import { SetMetadata } from '@nestjs/common';
import {
  IDEMPOTENCY_METADATA_KEY,
  IDEMPOTENCY_TTL_SECONDS_DEFAULT,
} from './idempotency.constants';

export interface RequiresIdempotencyOptions {
  /**
   * Time-to-live for the cached response, in seconds. Defaults to 24 hours.
   */
  ttl?: number;
}

export interface RequiresIdempotencyMetadata {
  ttl: number;
}

/**
 * Mark a controller handler as requiring an `Idempotency-Key` header. When the
 * header is present and well-formed, the IdempotencyInterceptor will:
 *   - return the cached response for an exact body match within the TTL window
 *   - return HTTP 422 if the same key is replayed with a different body
 *   - return HTTP 409 if a request with the same key is still in flight
 *
 * The header is OPT-IN at the route level: handlers without this decorator
 * are unaffected so that incremental rollout cannot accidentally change the
 * behavior of unrelated endpoints.
 */
export const RequiresIdempotency = (options: RequiresIdempotencyOptions = {}) =>
  SetMetadata(IDEMPOTENCY_METADATA_KEY, {
    ttl: options.ttl ?? IDEMPOTENCY_TTL_SECONDS_DEFAULT,
  } satisfies RequiresIdempotencyMetadata);
