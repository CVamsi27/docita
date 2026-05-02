import { Module } from '@nestjs/common';
import { EphemeralStoreCleanupScheduler } from './ephemeral-store-cleanup.scheduler';

/**
 * Worker-only: relies on global `PrismaWorkerModule` / `PrismaModule` for
 * `PrismaService` injection.
 */
@Module({
  providers: [EphemeralStoreCleanupScheduler],
})
export class EphemeralStoreSchedulerModule {}
