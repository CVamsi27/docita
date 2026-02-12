import { Module, forwardRef } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { TemplatesService } from './templates.service';
import { TemplatesFacadeService } from './templates-facade.service';
import { DefaultTemplatesService } from './default-templates.service';
import { TemplateDataService } from './template-data.service';
import { TemplateVariableService } from './template-variable.service';
import { TemplateResolutionService } from './template-resolution.service';
import { TemplateModeService } from './template-mode.service';
import { WhatsappClientService } from './whatsapp-client.service';
import { WhatsappWebhookService } from './whatsapp-webhook.service';
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
    // Templates specialized services
    DefaultTemplatesService,
    TemplateDataService,
    TemplateVariableService,
    TemplateResolutionService,
    TemplateModeService,
    // Templates facade (exported as TemplatesService for backward compatibility)
    TemplatesFacadeService,
    { provide: 'TemplatesService', useClass: TemplatesFacadeService },
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
  ],
})
export class WhatsappModule {}
