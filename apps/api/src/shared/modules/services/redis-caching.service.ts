import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as redis from 'redis';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
}

@Injectable()
export class RedisCachingService implements OnModuleInit {
  private readonly logger = new Logger(RedisCachingService.name);
  private client: redis.RedisClientType;
  private isConnected = false;

  constructor(private configService: AppConfigService) {
    const redisConfig = this.configService.getRedisConfig();
    this.client = redis.createClient({
      password: redisConfig.password,
      username: redisConfig.username,
      socket: {
        host: redisConfig.host,
        port: redisConfig.port,
        reconnectStrategy: (retries: number) => {
          return Math.min(retries * 50, 500);
        },
      },
    });

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
    if (this.configService.getCacheProvider() !== 'redis') {
      return;
    }

    try {
      await Promise.race([
        this.client.connect(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Redis connection timed out')),
            3000,
          ),
        ),
      ]);
    } catch (error) {
      this.logger.warn(
        `Redis connection failed: ${error instanceof Error ? error.message : 'Unknown error'} - caching disabled`,
      );
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) return null;

    try {
      const value = await this.client.get(key);
      if (!value) return null;

      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.warn(
        `Cache get error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    if (!this.isConnected) return;

    try {
      const ttl = options?.ttl || 300;
      await this.client.setEx(key, ttl, JSON.stringify(value));

      if (options?.tags?.length) {
        for (const tag of options.tags) {
          await this.client.sAdd(`tag:${tag}`, key);
          await this.client.expire(`tag:${tag}`, ttl * 2);
        }
      }
    } catch (error) {
      this.logger.warn(
        `Cache set error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.warn(
        `Cache delete error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

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
      this.logger.warn(
        `Cache tag invalidation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async clear(): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.client.flushAll();
      this.logger.log('Cache cleared');
    } catch (error) {
      this.logger.warn(
        `Cache clear error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async getStats(): Promise<{
    info: string;
    dbSize: number;
    connected: boolean;
  }> {
    if (!this.isConnected) {
      return { info: 'Redis not connected', dbSize: 0, connected: false };
    }

    try {
      const info = await this.client.info('stats');
      const dbSize = await this.client.dbSize();

      return { info, dbSize, connected: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Cache stats error: ${errorMsg}`);
      return { info: errorMsg, dbSize: 0, connected: false };
    }
  }
}
