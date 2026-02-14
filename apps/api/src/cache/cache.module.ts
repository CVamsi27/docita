import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    NestCacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');

        if (!redisUrl) {
          console.warn('No REDIS_URL found, using in-memory cache');
          return {
            isGlobal: true,
            ttl: 300000, // 5 minutes default TTL
          };
        }

        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const redisStore = require('cache-manager-redis-store');
          console.warn(`Initializing Redis cache at ${redisUrl}`);
          return {
            store: redisStore,
            url: redisUrl,
            ttl: 300000,
            isGlobal: true,
          } as any;
        } catch (error) {
          console.warn(
            'Failed to initialize Redis store, using in-memory cache',
            error,
          );
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
