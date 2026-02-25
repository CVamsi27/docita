/**
 * In-Memory Cache Service
 *
 * Simple in-memory cache implementation.
 * Use for development/testing. For production, use Redis.
 */

import { Injectable } from '@nestjs/common';
import { ICacheProvider } from './cache.interface';

interface CacheEntry<T> {
  value: T;
  expiresAt?: number;
}

@Injectable()
export class InMemoryCacheService implements ICacheProvider {
  private cache = new Map<string, CacheEntry<any>>();

  async get<T>(key: string): Promise<T | null> {
    await Promise.resolve();
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
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

    // Check if expired
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

  /**
   * Clean expired entries (useful for memory management)
   * Should be called periodically
   */
  cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache stats for monitoring
   */
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
