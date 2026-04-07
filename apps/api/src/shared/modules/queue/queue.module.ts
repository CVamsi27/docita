import { Module } from '@nestjs/common';
import { InMemoryQueueService } from './in-memory-queue.service';

@Module({
  providers: [
    {
      provide: 'queue',
      useFactory: () => new InMemoryQueueService(),
    },
    InMemoryQueueService,
  ],
  exports: ['queue'],
})
export class QueueModule {}
