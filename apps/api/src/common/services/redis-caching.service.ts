/**
 * Redis Caching Service
 * Provides centralized caching layer for frequently-accessed data
 * Supports TTL management, cache invalidation, and circuit breaking
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as redis from 'redis';

export interface CacheOptions {
  ttl?: number; // seconds
  tags?: string[]; // for group invalidation
}

@Injectable()
export class RedisCachingService implements OnModuleInit {
  private readonly logger = new Logger(RedisCachingService.name);
  private client: redis.RedisClientType;
  private isConnected = false;

  constructor() {
    this.client = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      username: process.env.REDIS_USERNAME,
      socket: {
        reconnectStrategy: (retries) => {
          return Math.min(retries * 50, 500);
        },
      },
    } as any);

    this.client.on('error', (err) => {
      this.logger.error(`Redis error: ${err.message}`);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      this.logger.log('Redis connected');
      this.isConnected = true;
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      this.logger.warn(`Redis connection failed: ${error.message} - caching disabled`);
    }
  }

  /**
   * Get cached value by key
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) return null;

    try {
      const value = await this.client.get(key);
      if (!value) return null;

      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.warn(`Cache get error: ${error.message}`);
      return null;
    }
  }

  /**
   * Set cached value with optional TTL
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    if (!this.isConnected) return;

    try {
      const ttl = options?.ttl || 300; // default 5 minutes
      await this.client.setEx(key, ttl, JSON.stringify(value));

      // Add to tag sets for group invalidation
      if (options?.tags?.length) {
        for (const tag of options.tags) {
          await this.client.sAdd(`tag:${tag}`, key);
          await this.client.expire(`tag:${tag}`, ttl * 2);
        }
      }
    } catch (error) {
      this.logger.warn(`Cache set error: ${error.message}`);
    }
  }

  /**
   * Delete cached value
   */
  async delete(key: string): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.warn(`Cache delete error: ${error.message}`);
    }
  }

  /**
   * Invalidate all keys with a specific tag
   */
  async invalidateTag(tag: string): Promise<void> {
    if (!this.isConnected) return;

    try {
      const keys = await this.client.sMembers(`tag:${tag}`);
      if (keys.length > 0) {
        await this.client.del(keys);
        this.logger.log(`Invalidated ${keys.length} keys with tag ${tag}`);
      }
      await this.client.del(`tag:${tag}`);
    } catch (error) {
      this.logger.warn(`Cache tag invalidation error: ${error.message}`);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.client.flushAll();
      this.logger.log('Cache cleared');
    } catch (error) {
      this.logger.warn(`Cache clear error: ${error.message}`);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ info: string; dbSize: number; connected: boolean }> {
    if (!this.isConnected) {
      return { info: 'Redis not connected', dbSize: 0, connected: false };
    }

    try {
      const info = await this.client.info('stats');
      const dbSize = await this.client.dbSize();

      return { info, dbSize, connected: true };
    } catch (error) {
      this.logger.warn(`Cache stats error: ${error.message}`);
      return { info: error.message, dbSize: 0, connected: false };
    }
  }
}
