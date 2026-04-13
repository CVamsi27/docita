import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ICacheProvider } from './cache.interface';

interface CacheEntry<T> {
  value: T;
  expiresAt?: number;
}

const MAX_ENTRIES = 10000;
const CLEANUP_INTERVAL_MS = 60_000;

@Injectable()
export class InMemoryCacheService
  implements ICacheProvider, OnModuleInit, OnModuleDestroy
{
  private cache = new Map<string, CacheEntry<unknown>>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  onModuleInit() {
    this.cleanupTimer = setInterval(
      () => this.cleanExpired(),
      CLEANUP_INTERVAL_MS,
    );
    this.cleanupTimer.unref?.();
  }

  onModuleDestroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    await Promise.resolve();
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (this.cache.size >= MAX_ENTRIES && !this.cache.has(key)) {
      this.cleanExpired();
      if (this.cache.size >= MAX_ENTRIES) {
        const oldestKey = this.cache.keys().next().value;
        if (oldestKey !== undefined) {
          this.cache.delete(oldestKey);
        }
      }
    }
    const expiresAt = ttl ? Date.now() + ttl * 1000 : undefined;
    this.cache.set(key, { value, expiresAt });
    await Promise.resolve();
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
    await Promise.resolve();
  }

  async clear(): Promise<void> {
    this.cache.clear();
    await Promise.resolve();
  }

  async exists(key: string): Promise<boolean> {
    await Promise.resolve();
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  async increment(key: string, by = 1): Promise<number> {
    const current = (await this.get<number>(key)) || 0;
    const next = current + by;
    await this.set(key, next);
    return next;
  }

  async decrement(key: string, by = 1): Promise<number> {
    const current = (await this.get<number>(key)) || 0;
    const next = current - by;
    await this.set(key, next);
    return next;
  }

  cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        expiresAt: entry.expiresAt ? new Date(entry.expiresAt) : null,
        expiresIn: entry.expiresAt
          ? ((entry.expiresAt - Date.now()) / 1000).toFixed(1) + 's'
          : 'never',
      })),
    };
  }
}
