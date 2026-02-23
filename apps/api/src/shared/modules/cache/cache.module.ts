/**
 * Cache Module
 * 
 * Provides caching abstraction with multiple implementation options:
 * - InMemoryCacheService: For development
 * - RedisCacheService: For production distributed caching
 * 
 * Usage:
 * 1. Import CacheModule in your feature module
 * 2. Inject ICacheProvider -> 'cache' into your service
 * 3. Use cache.get(), cache.set(), etc.
 * 
 * Example:
 * @Injectable()
 * export class UserService {
 *   constructor(
 *     @Inject('cache') private cache: ICacheProvider,
 *   ) {}
 *
 *   async getUser(id: string) {
 *     const cached = await this.cache.get<User>(`user:${id}`);
 *     if (cached) return cached;
 *
 *     const user = await this.db.user.findUnique({ where: { id } });
 *     await this.cache.set(`user:${id}`, user, 3600);
 *     return user;
 *   }
 * }
 */

import { Module } from '@nestjs/common';
import { ICacheProvider } from './cache.interface';
import { InMemoryCacheService } from './in-memory-cache.service';
import { RedisCacheService } from './redis-cache.service';

const useRedis = process.env.CACHE_PROVIDER === 'redis';

@Module({
  providers: [
    {
      provide: 'cache',
      useClass: useRedis ? RedisCacheService : InMemoryCacheService,
    },
    InMemoryCacheService,
    RedisCacheService,
  ],
  exports: ['cache'],
})
export class CacheModule {}
