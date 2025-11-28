import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    // ✅ OPTIMIZATION: Register Bull queues for async job processing
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');

        if (!redisUrl) {
          // Fallback to in-memory if Redis is not available
          return {};
        }

        return {
          redis: redisUrl,
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
            removeOnComplete: true,
          },
        };
      },
    }),
    // ✅ Register specific queues for analytics and other async tasks
    BullModule.registerQueue(
      { name: 'analytics' },
      { name: 'notifications' },
      { name: 'reports' },
      { name: 'imports' },
    ),
  ],
  controllers: [QueueController],
  providers: [QueueService],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
