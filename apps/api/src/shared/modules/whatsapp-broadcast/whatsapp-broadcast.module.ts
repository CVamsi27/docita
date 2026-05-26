import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { WhatsappModule } from '@/shared/modules/messaging/whatsapp/whatsapp.module';
import { WhatsAppBroadcastService } from './whatsapp-broadcast.service';

@Module({
  imports: [PrismaModule, forwardRef(() => WhatsappModule)],
  providers: [WhatsAppBroadcastService],
  exports: [WhatsAppBroadcastService],
})
export class WhatsAppBroadcastModule {}
