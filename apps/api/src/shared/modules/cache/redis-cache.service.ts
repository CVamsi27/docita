import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ICacheProvider } from './cache.interface';
import Redis from 'ioredis';
import { AppConfigService } from '../config/app-configuration.service';

@Injectable()
export class RedisCacheService
  implements ICacheProvider, OnModuleInit, OnModuleDestroy
{
  private redis: Redis | null = null;

  constructor(private configService: AppConfigService) {}

  onModuleInit() {
    const { host, port, password } = this.configService.getRedisConfig();
    this.redis = new Redis({
      host,
      port,
      password: password || undefined,
      retryStrategy: (times: number) => Math.min(times * 50, 2000),
    });
  }

  onModuleDestroy() {
    if (this.redis) {
      this.redis.disconnect();
    }
  }

  private ensureConnected() {
    if (!this.redis) {
      throw new Error('Redis client not initialized');
    }
  }

  async get<T>(key: string): Promise<T | null> {
    this.ensureConnected();
    const value = await this.redis!.get(key);

    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value);
    } catch {
      return value as unknown as T;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    this.ensureConnected();
    const serialized =
      typeof value === 'string' ? value : JSON.stringify(value);

    if (ttl) {
      await this.redis!.setex(key, ttl, serialized);
    } else {
      await this.redis!.set(key, serialized);
    }
  }

  async delete(key: string): Promise<void> {
    this.ensureConnected();
    await this.redis!.del(key);
  }

  async clear(): Promise<void> {
    this.ensureConnected();
    await this.redis!.flushdb();
  }

  async exists(key: string): Promise<boolean> {
    this.ensureConnected();
    const exists = await this.redis!.exists(key);
    return exists === 1;
  }

  async increment(key: string, by = 1): Promise<number> {
    this.ensureConnected();
    return await this.redis!.incrby(key, by);
  }

  async decrement(key: string, by = 1): Promise<number> {
    this.ensureConnected();
    return await this.redis!.decrby(key, by);
  }

  async deletePattern(pattern: string): Promise<void> {
    this.ensureConnected();
    const keys = await this.redis!.keys(pattern);

    if (keys.length > 0) {
      await this.redis!.del(...keys);
    }
  }

  async getStats() {
    this.ensureConnected();
    const info = await this.redis!.info('memory');
    return info;
  }
}
