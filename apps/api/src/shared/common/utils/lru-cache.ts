/**
 * Lightweight in-process LRU cache with TTL. Use for read-heavy lookups where
 * staleness is tolerable (e.g. medical-code search typeahead).
 *
 * For caches with cross-instance sharing or eviction policies beyond LRU,
 * use the cache-manager backed `CACHE_MANAGER` from `@nestjs/cache-manager`.
 */
export class LruCache<T> {
  private readonly store = new Map<string, { value: T; expiresAt: number }>();

  constructor(
    private readonly capacity: number,
    private readonly ttlMs: number,
  ) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    // Touch: move to end as MRU.
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T): void {
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.capacity) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) this.store.delete(oldestKey);
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  clear(): void {
    this.store.clear();
  }
}
