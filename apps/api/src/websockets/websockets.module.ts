import { Module, forwardRef } from '@nestjs/common';
import { PaymentWebSocketGateway } from './payment.websocket.gateway';
import { NotificationsGateway } from './notifications.gateway';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthModule } from '@/shared/modules/auth/auth/auth.module';

@Module({
  imports: [PrismaModule, forwardRef(() => AuthModule)],
  providers: [PaymentWebSocketGateway, NotificationsGateway],
  exports: [PaymentWebSocketGateway, NotificationsGateway],
})
export class WebsocketsModule {}
