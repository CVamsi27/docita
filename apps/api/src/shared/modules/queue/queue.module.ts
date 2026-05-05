import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { InMemoryQueueService } from './in-memory-queue.service';
import { PostgresQueueService } from './postgres-queue.service';
import { PdfJobService } from './pdf-job.service';
import { WorkerMetricsService } from './worker-metrics.service';
import { DlqController } from './dlq.controller';

@Module({
  imports: [PrismaModule],
  controllers: [DlqController],
  providers: [
    WorkerMetricsService,
    {
      provide: 'queue',
      useFactory: (
        prisma: PrismaService,
        config: AppConfigService,
        metrics: WorkerMetricsService,
      ) =>
        config.getQueueBackend() === 'postgres'
          ? new PostgresQueueService(prisma, metrics)
          : new InMemoryQueueService(),
      inject: [PrismaService, AppConfigService, WorkerMetricsService],
    },
    PdfJobService,
  ],
  exports: ['queue', PdfJobService, WorkerMetricsService],
})
export class QueueModule {}
