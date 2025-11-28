import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    NestCacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');

        // If no Redis URL is provided, use in-memory cache
        if (!redisUrl) {
          return {
            isGlobal: true,
            ttl: 300000, // 5 minutes default TTL
          };
        }

        // Use Redis store for caching
        try {
          const redisStore = await import('cache-manager-redis-store');
          return {
            store: redisStore.default,
            url: redisUrl,
            ttl: 300000, // 5 minutes default TTL
            isGlobal: true,
          };
        } catch {
          // Fallback to in-memory if redis store is not available
          console.warn('Redis store not available, using in-memory cache');
          return {
            isGlobal: true,
            ttl: 300000,
          };
        }
      },
    }),
  ],
})
export class CacheConfigModule {}
