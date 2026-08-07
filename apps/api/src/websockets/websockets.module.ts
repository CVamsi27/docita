import { Module, forwardRef } from '@nestjs/common';
import { PaymentWebSocketGateway } from './payment.websocket.gateway';
import { NotificationsGateway } from './notifications.gateway';
import { BillingModule } from '@/domains/billing/billing.module';
import { AuthModule } from '@/shared/modules/auth/auth/auth.module';

@Module({
  imports: [BillingModule, forwardRef(() => AuthModule)],
  providers: [PaymentWebSocketGateway, NotificationsGateway],
  exports: [PaymentWebSocketGateway, NotificationsGateway],
})
export class WebsocketsModule {}
