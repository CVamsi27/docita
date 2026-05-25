import { Module } from '@nestjs/common';
import { PrismaWorkerModule } from '@/prisma/prisma.worker.module';
import { PrismaService } from '@/prisma/prisma.service';
import { InMemoryQueueService } from './in-memory-queue.service';
import { PostgresQueueService } from './postgres-queue.service';
import { PrismaQueueJobRepository } from './infrastructure/prisma-queue-job.repository';
import { PdfJobService } from './pdf-job.service';
import { CLOCK_PORT } from '@/shared/common/ports/clock.port';
import type { IClock } from '@/shared/common/ports/clock.port';

@Module({
  imports: [PrismaWorkerModule],
  providers: [
    {
      provide: 'queue',
      useFactory: (prisma: PrismaService, clock: IClock) =>
        process.env.QUEUE_BACKEND === 'postgres'
          ? new PostgresQueueService(
              prisma,
              clock,
              new PrismaQueueJobRepository(prisma),
            )
          : new InMemoryQueueService(),
      inject: [PrismaService, CLOCK_PORT],
    },
    PdfJobService,
  ],
  exports: ['queue', PdfJobService],
})
export class QueueWorkerModule {}
