import { Module } from '@nestjs/common';
import { InMemoryQueueService } from './in-memory-queue.service';
import { BullMQQueueService } from './bull-mq-queue.service';
import { AppConfigService } from '../config/app-configuration.service';

@Module({
  providers: [
    {
      provide: 'queue',
      useFactory: (configService: AppConfigService) => {
        const provider = configService.getQueueProvider();
        return provider === 'bull'
          ? new BullMQQueueService(configService)
          : new InMemoryQueueService();
      },
      inject: [AppConfigService],
    },
    InMemoryQueueService,
    BullMQQueueService,
  ],
  exports: ['queue'],
})
export class QueueModule {}
