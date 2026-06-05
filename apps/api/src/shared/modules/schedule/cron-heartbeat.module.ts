import { Module } from '@nestjs/common';
import { PrismaWorkerModule } from '@/prisma/prisma.worker.module';
import { PrismaCronHeartbeatService } from './cron-heartbeat';

@Module({
  imports: [PrismaWorkerModule],
  providers: [PrismaCronHeartbeatService],
})
export class CronHeartbeatModule {}
