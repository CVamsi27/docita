import { Module } from '@nestjs/common';
import { CACHE_PROVIDER } from './cache.interface';
import { InMemoryCacheService } from './in-memory-cache.service';
import { RedisCacheService } from './redis-cache.service';
import { AppConfigModule } from '@/shared/modules/config/config.module';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

@Module({
  imports: [AppConfigModule],
  providers: [
    {
      provide: CACHE_PROVIDER,
      useFactory: (config: AppConfigService) => {
        if (config.getCacheBackend() === 'redis') {
          return new RedisCacheService(config.getRedisUrl());
        }
        return new InMemoryCacheService();
      },
      inject: [AppConfigService],
    },
    InMemoryCacheService,
  ],
  exports: [CACHE_PROVIDER],
})
export class CacheModule {}
