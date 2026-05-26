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
