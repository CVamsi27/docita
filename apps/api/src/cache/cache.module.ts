import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

@Module({
  imports: [
    NestCacheModule.registerAsync({
      isGlobal: true,
      inject: [AppConfigService],
      useFactory: (
        configService: AppConfigService,
      ): {
        isGlobal: boolean;
        ttl: number;
        max?: number;
        store?: unknown;
        url?: string;
      } => {
        const redisUrl = configService.getRedisConfig().url;

        if (!redisUrl) {
          return {
            isGlobal: true,
            ttl: 300000,
            max: 500,
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
        } catch {
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
