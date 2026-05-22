import { PrismaService } from '@/prisma/prisma.service';
import { WHATSAPP_PERSISTENCE_PORT } from './application/ports/whatsapp-persistence.port';
import { Module, Global, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SendMessageUseCase } from './application/use-cases/send-message.use-case';
import { HandleWebhookUseCase } from './application/use-cases/handle-webhook.use-case';
import { WhatsAppQueryService } from './application/services/whatsapp-query.service';
import { WhatsAppAutomationService } from './application/services/whatsapp-automation.service';
import { WhatsappSenderResolver } from './application/services/whatsapp-sender-resolver.service';
import { WhatsappSenderSettingsService } from './application/services/whatsapp-sender-settings.service';
import { WHATSAPP_REPOSITORY_TOKEN } from './application/ports/whatsapp.repository.port';
import { PrismaWhatsAppRepository } from './infrastructure/repositories/prisma-whatsapp.repository';
import { PrismaWhatsAppMessageRepository } from './infrastructure/repositories/prisma-whatsapp-message.repository';
import { PrismaWhatsAppTemplateRepository } from './infrastructure/repositories/prisma-whatsapp-template.repository';
import { WhatsAppController } from './presentation/controllers/whatsapp.controller';
import { WhatsAppWebhookController } from './presentation/controllers/whatsapp-webhook.controller';
import { WhatsappSenderController } from './presentation/controllers/whatsapp-sender.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { TemplateResolverService } from './core/services/template-resolver.service';
import { SupportWhatsAppModule } from '@/shared/modules/support-whatsapp';
import { WhatsappTemplatesModule } from '@/shared/whatsapp/whatsapp-templates.module';
import { WhatsappModule } from '@/domains/whatsapp/whatsapp-clinic.module';
import { MetaGraphPhoneProfileClient } from './infrastructure/clients/meta-graph-phone-profile.client';

@Global()
@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    WhatsappTemplatesModule,
    SupportWhatsAppModule,
    forwardRef(() => WhatsappModule),
  ],
  controllers: [
    WhatsAppController,
    WhatsAppWebhookController,
    WhatsappSenderController,
  ],
  providers: [
    { provide: WHATSAPP_PERSISTENCE_PORT, useExisting: PrismaService },
    SendMessageUseCase,
    HandleWebhookUseCase,
    WhatsAppQueryService,
    WhatsAppAutomationService,
    WhatsappSenderResolver,
    MetaGraphPhoneProfileClient,
    WhatsappSenderSettingsService,
    TemplateResolverService,
    PrismaWhatsAppMessageRepository,
    PrismaWhatsAppTemplateRepository,
    {
      provide: WHATSAPP_REPOSITORY_TOKEN,
      useClass: PrismaWhatsAppRepository,
    },
  ],
  exports: [
    SendMessageUseCase,
    WhatsAppQueryService,
    WhatsAppAutomationService,
    WhatsappSenderResolver,
    WhatsappSenderSettingsService,
    WHATSAPP_REPOSITORY_TOKEN,
    WhatsappTemplatesModule,
    TemplateResolverService,
  ],
})
export class WhatsAppModule {}
