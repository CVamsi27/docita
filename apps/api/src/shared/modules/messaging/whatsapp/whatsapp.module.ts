import { Module, forwardRef } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { TemplatesService as _TemplatesService } from './templates.service';
import { TemplatesFacadeService } from './templates-facade.service';
import { DefaultTemplatesService } from './default-templates.service';
import { TemplateDataService } from './template-data.service';
import { TemplateVariableService } from './template-variable.service';
import { TemplateResolutionService } from './template-resolution.service';
import { TemplateModeService } from './template-mode.service';
import { WhatsappResendService } from './resend.service';
import { SystemEventsService } from './system-events.service';
import { ApprovalService } from './approval.service';
import { MessagingService } from './messaging.service';
import { TemplateMessageService } from './template-message.service';
import { WhatsappClientService } from './whatsapp-client.service';
import { WhatsappWebhookService } from './whatsapp-webhook.service';
import { WhatsappController } from './whatsapp.controller';
import { StaffNotificationController } from './staff-notification.controller';
import { ResponseHandlerService } from './response-handler.service';
import { StaffNotificationService } from './staff-notification.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { WhatsappEventListener } from './listeners/whatsapp.listener';
import { SupportWhatsAppModule } from '@/shared/modules/support-whatsapp';

@Module({
  imports: [PrismaModule, forwardRef(() => SupportWhatsAppModule)],
  controllers: [WhatsappController, StaffNotificationController],
  providers: [
    DefaultTemplatesService,
    TemplateDataService,
    TemplateVariableService,
    TemplateResolutionService,
    TemplateModeService,

    TemplatesFacadeService,
    { provide: 'TemplatesService', useClass: TemplatesFacadeService },

    WhatsappResendService,
    SystemEventsService,
    ApprovalService,
    MessagingService,
    TemplateMessageService,

    WhatsappService,

    WhatsappClientService,
    WhatsappWebhookService,
    ResponseHandlerService,
    StaffNotificationService,
    WhatsappEventListener,
  ],
  exports: [
    WhatsappService,
    TemplatesFacadeService,
    WhatsappClientService,
    WhatsappWebhookService,
    ResponseHandlerService,
    StaffNotificationService,
    SystemEventsService,
  ],
})
export class WhatsappModule {}
