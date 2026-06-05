import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { InMemoryQueueService } from './in-memory-queue.service';
import { PostgresQueueService } from './postgres-queue.service';
import { PrismaQueueJobRepository } from './infrastructure/prisma-queue-job.repository';
import { PdfJobService } from './pdf-job.service';
import { WorkerMetricsService } from './worker-metrics.service';
import { DlqController } from './dlq.controller';
import { CLOCK_PORT } from '@/shared/common/ports/clock.port';
import type { IClock } from '@/shared/common/ports/clock.port';
import { DocumentsModule } from '@/domains/documents/documents.module';

@Module({
  imports: [PrismaModule, DocumentsModule],
  controllers: [DlqController],
  providers: [
    WorkerMetricsService,
    {
      provide: 'queue',
      useFactory: (
        prisma: PrismaService,
        config: AppConfigService,
        clock: IClock,
        metrics: WorkerMetricsService,
      ) =>
        config.getQueueBackend() === 'postgres'
          ? new PostgresQueueService(
              prisma,
              clock,
              new PrismaQueueJobRepository(prisma),
              metrics,
            )
          : new InMemoryQueueService(),
      inject: [
        PrismaService,
        AppConfigService,
        CLOCK_PORT,
        WorkerMetricsService,
      ],
    },
    PdfJobService,
  ],
  exports: ['queue', PdfJobService, WorkerMetricsService],
})
export class QueueModule {}
