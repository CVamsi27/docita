import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { SupportWhatsAppInboxService } from './support-whatsapp-inbox.service';
import { WhatsappModule } from '@/shared/modules/messaging/whatsapp/whatsapp.module';

@Module({
  imports: [PrismaModule, forwardRef(() => WhatsappModule)],
  providers: [SupportWhatsAppInboxService],
  exports: [SupportWhatsAppInboxService],
})
export class SupportWhatsAppModule {}
