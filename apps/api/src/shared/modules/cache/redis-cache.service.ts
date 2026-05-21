import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { ICacheProvider } from './cache.interface';
import { parseSerializedJson } from '@/shared/common/json/parse-serialized-json.boundary';

@Injectable()
export class RedisCacheService implements ICacheProvider, OnModuleDestroy {
  private readonly client: Redis;
  private readonly keyPrefix = 'docita:cache:';

  constructor(redisUrl: string) {
    this.client = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(this.buildKey(key));
    if (raw === null) {
      return null;
    }
    try {
      return parseSerializedJson<T>(raw);
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttl && ttl > 0) {
      await this.client.set(this.buildKey(key), serialized, 'EX', ttl);
      return;
    }
    await this.client.set(this.buildKey(key), serialized);
  }

  async delete(key: string): Promise<void> {
    await this.client.del(this.buildKey(key));
  }

  async clear(): Promise<void> {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.client.scan(
        cursor,
        'MATCH',
        `${this.keyPrefix}*`,
        'COUNT',
        100,
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } while (cursor !== '0');
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(this.buildKey(key))) > 0;
  }

  async increment(key: string, by = 1): Promise<number> {
    return this.client.incrby(this.buildKey(key), by);
  }

  async decrement(key: string, by = 1): Promise<number> {
    return this.client.decrby(this.buildKey(key), by);
  }

  private buildKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }
}
