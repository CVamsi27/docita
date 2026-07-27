import { PrismaService } from '@/prisma/prisma.service';
import { WHATSAPP_PERSISTENCE_PORT } from './application/ports/whatsapp-persistence.port';
import { Module, Global, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SendMessageUseCase } from './application/use-cases/send-message.use-case';
import { HandleWebhookUseCase } from './application/use-cases/handle-webhook.use-case';
import { WhatsAppQueryService } from './application/services/whatsapp-query.service';
import { WhatsAppAutomationService } from './application/services/whatsapp-automation.service';
import { WhatsappMessageDeliveryService } from './application/services/whatsapp-message-delivery.service';
import { WhatsappSenderResolver } from './application/services/whatsapp-sender-resolver.service';
import { WhatsappSenderSettingsService } from './application/services/whatsapp-sender-settings.service';
import {
  WHATSAPP_OPERATIONS_REPOSITORY_TOKEN,
  WHATSAPP_REPOSITORY_TOKEN,
} from './application/ports/whatsapp.repository.port';
import { WHATSAPP_REPOSITORY_PROVIDERS } from './infrastructure/repositories/whatsapp-repository.providers';
import { WhatsAppController } from './presentation/controllers/whatsapp.controller';
import { WhatsAppWebhookController } from './presentation/controllers/whatsapp-webhook.controller';
import { WhatsappSenderController } from './presentation/controllers/whatsapp-sender.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { TemplateResolverService } from './core/services/template-resolver.service';
import { SupportWhatsAppModule } from '@/shared/modules/support-whatsapp';
import { WhatsappTemplatesModule } from '@/shared/whatsapp/whatsapp-templates.module';
import { WhatsappModule } from '@/domains/whatsapp/whatsapp-clinic.module';
import { MetaGraphPhoneProfileClient } from './infrastructure/clients/meta-graph-phone-profile.client';
import { PrismaWhatsappOperationsRepository } from './infrastructure/repositories/prisma-whatsapp-operations.repository';
import { WhatsappOperationsService } from './application/services/whatsapp-operations.service';
import { WhatsappOperationsController } from './presentation/controllers/whatsapp-operations.controller';
import { WhatsappClientAdapter } from './infrastructure/clients/whatsapp-client.adapter';
import { WHATSAPP_CLIENT_TOKEN } from './application/ports/whatsapp-client.port';

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
    WhatsappOperationsController,
  ],
  providers: [
    { provide: WHATSAPP_PERSISTENCE_PORT, useExisting: PrismaService },
    SendMessageUseCase,
    HandleWebhookUseCase,
    WhatsAppQueryService,
    WhatsAppAutomationService,
    WhatsappMessageDeliveryService,
    WhatsappSenderResolver,
    MetaGraphPhoneProfileClient,
    WhatsappSenderSettingsService,
    TemplateResolverService,
    ...WHATSAPP_REPOSITORY_PROVIDERS,
    PrismaWhatsappOperationsRepository,
    {
      provide: WHATSAPP_OPERATIONS_REPOSITORY_TOKEN,
      useExisting: PrismaWhatsappOperationsRepository,
    },
    WhatsappOperationsService,
    WhatsappClientAdapter,
    {
      provide: WHATSAPP_CLIENT_TOKEN,
      useExisting: WhatsappClientAdapter,
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
    WHATSAPP_CLIENT_TOKEN,
  ],
})
export class WhatsAppModule {}
