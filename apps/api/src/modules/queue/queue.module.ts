import { Module } from '@nestjs/common';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [QueueController],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
