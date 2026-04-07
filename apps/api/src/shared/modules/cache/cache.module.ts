import { Module } from '@nestjs/common';
import { ICacheProvider as _ICacheProvider } from './cache.interface';
import { InMemoryCacheService } from './in-memory-cache.service';
import { AppConfigModule } from '@/shared/modules/config/config.module';

@Module({
  imports: [AppConfigModule],
  providers: [
    {
      provide: 'cache',
      useFactory: () => new InMemoryCacheService(),
    },
    InMemoryCacheService,
  ],
  exports: ['cache'],
})
export class CacheModule {}
