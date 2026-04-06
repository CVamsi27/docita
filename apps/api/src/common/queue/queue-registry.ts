import { BullModule } from '@nestjs/bull';
import { MockBullModule } from '@/common/mocks/mock-bull.module';

/**
 * Resolves to real @nestjs/bull when REDIS_URL is set, otherwise falls back
 * to the no-op mock (safe for local dev without Redis).
 *
 * Usage — root registration (app.module.ts):
 *   QueueRegistry.forRootAsync()
 *
 * Usage — queue registration (domain modules):
 *   QueueRegistry.registerQueue({ name: 'audit', ... })
 */
export const QueueRegistry = process.env.REDIS_URL ? BullModule : MockBullModule;
