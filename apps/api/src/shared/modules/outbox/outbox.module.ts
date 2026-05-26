import { Module } from '@nestjs/common';
import { StubOutboxService } from './outbox.service';

@Module({
  providers: [
    StubOutboxService,
    { provide: 'IOutboxService', useExisting: StubOutboxService },
  ],
  exports: [StubOutboxService, 'IOutboxService'],
})
export class OutboxModule {}
