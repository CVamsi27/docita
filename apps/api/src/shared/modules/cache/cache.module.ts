import { Module } from '@nestjs/common';
import { ICacheProvider } from './cache.interface';
import { InMemoryCacheService } from './in-memory-cache.service';
import { RedisCacheService } from './redis-cache.service';
import { AppConfigModule } from '../config/config.module';
import { AppConfigService } from '../config/app-configuration.service';

@Module({
  imports: [AppConfigModule],
  providers: [
    {
      provide: 'cache',
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => {
        return config.getCacheProvider() === 'redis'
          ? new RedisCacheService(config)
          : new InMemoryCacheService();
      },
    },
    InMemoryCacheService,
    RedisCacheService,
  ],
  exports: ['cache'],
})
export class CacheModule {}
