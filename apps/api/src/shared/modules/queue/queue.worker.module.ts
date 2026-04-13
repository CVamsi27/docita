import { Module } from '@nestjs/common';
import { PrismaWorkerModule } from '@/prisma/prisma.worker.module';
import { PrismaService } from '@/prisma/prisma.service';
import { InMemoryQueueService } from './in-memory-queue.service';
import { PostgresQueueService } from './postgres-queue.service';
import { PdfJobService } from './pdf-job.service';

@Module({
  imports: [PrismaWorkerModule],
  providers: [
    {
      provide: 'queue',
      useFactory: (prisma: PrismaService) =>
        process.env.QUEUE_BACKEND === 'postgres'
          ? new PostgresQueueService(prisma)
          : new InMemoryQueueService(),
      inject: [PrismaService],
    },
    PdfJobService,
  ],
  exports: ['queue', PdfJobService],
})
export class QueueWorkerModule {}
