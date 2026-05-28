import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { OutboxService } from './outbox.service';
import { OutboxRelayScheduler } from './outbox-relay.scheduler';

// Global so command-path services across every domain can inject
// `IOutboxService` (or `ITransactionRunner`, already provided globally by
// PrismaModule) without each domain module re-importing OutboxModule. The
// relay scheduler still registers only once because Nest @Global is a
// re-export hint, not an instance multiplier.
@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    OutboxService,
    OutboxRelayScheduler,
    { provide: 'IOutboxService', useExisting: OutboxService },
  ],
  exports: [OutboxService, OutboxRelayScheduler, 'IOutboxService'],
})
export class OutboxModule {}
