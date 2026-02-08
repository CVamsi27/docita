import { Module, forwardRef } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { WhatsappTemplatesService } from './templates.service';
import { WhatsappController } from './whatsapp.controller';
import { ResponseHandlerService } from './response-handler.service';
import { StaffNotificationService } from './staff-notification.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { WhatsappEventListener } from './listeners/whatsapp.listener';

@Module({
  imports: [PrismaModule],
  controllers: [WhatsappController],
  providers: [
    WhatsappService,
    WhatsappTemplatesService,
    ResponseHandlerService,
    StaffNotificationService,
    WhatsappEventListener,
  ],
  exports: [
    WhatsappService,
    WhatsappTemplatesService,
    ResponseHandlerService,
    StaffNotificationService,
  ],
})
export class WhatsappModule {}
