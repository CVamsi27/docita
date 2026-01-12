import { Module } from '@nestjs/common';
import { PushNotificationService } from './push-notification.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [PushNotificationService],
  exports: [PushNotificationService],
})
export class NotificationsModule {}
