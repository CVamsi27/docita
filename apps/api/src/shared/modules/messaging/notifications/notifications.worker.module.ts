import { Module } from '@nestjs/common';
import { PushNotificationService } from './push-notification.service';
import { PrismaWorkerModule } from '@/prisma/prisma.worker.module';

@Module({
  imports: [PrismaWorkerModule],
  providers: [PushNotificationService],
  exports: [PushNotificationService],
})
export class NotificationsWorkerModule {}
