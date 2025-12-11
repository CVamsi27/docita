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

        if (!redisUrl) {
          return {
            isGlobal: true,
            ttl: 300000, // 5 minutes default TTL
          };
        }
        try {
          const redisStore = await import('cache-manager-redis-store');
          return {
            store: redisStore.default,
            url: redisUrl,
            ttl: 300000, // 5 minutes default TTL
            isGlobal: true,
          };
        } catch {
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
