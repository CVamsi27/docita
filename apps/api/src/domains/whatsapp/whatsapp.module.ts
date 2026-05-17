import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SendMessageUseCase } from './application/use-cases/send-message.use-case';
import { HandleWebhookUseCase } from './application/use-cases/handle-webhook.use-case';
import { WhatsAppQueryService } from './application/services/whatsapp-query.service';
import { WhatsAppAutomationService } from './application/services/whatsapp-automation.service';
import { WhatsappSenderResolver } from './application/services/whatsapp-sender-resolver.service';
import { WhatsappSenderSettingsService } from './application/services/whatsapp-sender-settings.service';
import { WHATSAPP_REPOSITORY_TOKEN } from './application/ports/whatsapp.repository.port';
import { WHATSAPP_CLIENT_TOKEN } from './application/ports/whatsapp-client.port';
import { PrismaWhatsAppRepository } from './infrastructure/repositories/prisma-whatsapp.repository';
import { WhatsAppApiAdapter } from './infrastructure/adapters/whatsapp-api.adapter';
import { WhatsAppController } from './presentation/controllers/whatsapp.controller';
import { WhatsAppWebhookController } from './presentation/controllers/whatsapp-webhook.controller';
import { WhatsappSenderController } from './presentation/controllers/whatsapp-sender.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { DefaultTemplatesService } from './core/services/default-templates.service';
import { TemplateResolverService } from './core/services/template-resolver.service';
import { SupportWhatsAppModule } from '@/shared/modules/support-whatsapp';

@Global()
@Module({
  imports: [PrismaModule, ConfigModule, SupportWhatsAppModule],
  controllers: [
    WhatsAppController,
    WhatsAppWebhookController,
    WhatsappSenderController,
  ],
  providers: [
    SendMessageUseCase,
    HandleWebhookUseCase,
    WhatsAppQueryService,
    WhatsAppAutomationService,
    WhatsappSenderResolver,
    WhatsappSenderSettingsService,
    DefaultTemplatesService,
    TemplateResolverService,
    {
      provide: WHATSAPP_REPOSITORY_TOKEN,
      useClass: PrismaWhatsAppRepository,
    },
    {
      provide: WHATSAPP_CLIENT_TOKEN,
      useClass: WhatsAppApiAdapter,
    },
  ],
  exports: [
    SendMessageUseCase,
    WhatsAppQueryService,
    WhatsAppAutomationService,
    WhatsappSenderResolver,
    WhatsappSenderSettingsService,
    WHATSAPP_REPOSITORY_TOKEN,
    DefaultTemplatesService,
    TemplateResolverService,
  ],
})
export class WhatsAppModule {}
