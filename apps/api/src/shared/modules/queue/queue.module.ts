import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { InMemoryQueueService } from './in-memory-queue.service';
import { PostgresQueueService } from './postgres-queue.service';
import { PdfJobService } from './pdf-job.service';

@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: 'queue',
      useFactory: (prisma: PrismaService, config: AppConfigService) =>
        config.getQueueBackend() === 'postgres'
          ? new PostgresQueueService(prisma)
          : new InMemoryQueueService(),
      inject: [PrismaService, AppConfigService],
    },
    PdfJobService,
  ],
  exports: ['queue', PdfJobService],
})
export class QueueModule {}
