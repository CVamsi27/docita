import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    NestCacheModule.registerAsync({
      isGlobal: true,
      useFactory: (): { isGlobal: boolean; ttl: number; max: number } => ({
        isGlobal: true,
        ttl: 300000,
        max: 500,
      }),
    }),
  ],
})
export class CacheConfigModule {}
