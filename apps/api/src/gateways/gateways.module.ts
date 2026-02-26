import { Module, forwardRef } from '@nestjs/common';
import { PaymentWebSocketGateway } from './payment.websocket.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../shared/modules/auth/auth/auth.module';

@Module({
  imports: [PrismaModule, forwardRef(() => AuthModule)],
  providers: [PaymentWebSocketGateway],
  exports: [PaymentWebSocketGateway],
})
export class GatewaysModule {}
