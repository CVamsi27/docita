import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    NestCacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (
        configService: ConfigService,
      ): {
        isGlobal: boolean;
        ttl: number;
        store?: unknown;
        url?: string;
      } => {
        const redisUrl = configService.get<string>('REDIS_URL');

        if (!redisUrl) {
          return {
            isGlobal: true,
            ttl: 300000,
          };
        }

        try {
          const redisStore = require('cache-manager-redis-store');

          return {
            store: redisStore,
            url: redisUrl,
            ttl: 300000,
            isGlobal: true,
          };
        } catch (error) {
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
