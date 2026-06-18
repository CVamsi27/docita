import { PrismaService } from '@/prisma/prisma.service';
import { WHATSAPP_PERSISTENCE_PORT } from './application/ports/whatsapp-persistence.port';
import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SendMessageUseCase } from './application/use-cases/send-message.use-case';
import { WhatsAppQueryService } from './application/services/whatsapp-query.service';
import { WhatsAppAutomationService } from './application/services/whatsapp-automation.service';
import { WhatsappMessageDeliveryService } from './application/services/whatsapp-message-delivery.service';
import { WHATSAPP_REPOSITORY_TOKEN } from './application/ports/whatsapp.repository.port';
import { WHATSAPP_REPOSITORY_PROVIDERS } from './infrastructure/repositories/whatsapp-repository.providers';
import { WHATSAPP_CLIENT_TOKEN } from './application/ports/whatsapp-client.port';
import { WhatsappClientAdapter } from './infrastructure/clients/whatsapp-client.adapter';
import { PrismaWorkerModule } from '@/prisma/prisma.worker.module';
import { TemplateResolverService } from './core/services/template-resolver.service';
import { WhatsappTemplatesModule } from '@/shared/whatsapp/whatsapp-templates.module';

@Global()
@Module({
  imports: [PrismaWorkerModule, ConfigModule, WhatsappTemplatesModule],
  providers: [
    { provide: WHATSAPP_PERSISTENCE_PORT, useExisting: PrismaService },
    SendMessageUseCase,
    WhatsAppQueryService,
    WhatsAppAutomationService,
    WhatsappMessageDeliveryService,
    TemplateResolverService,
    ...WHATSAPP_REPOSITORY_PROVIDERS,
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
    WHATSAPP_REPOSITORY_TOKEN,
    WhatsappTemplatesModule,
    TemplateResolverService,
  ],
})
export class WhatsAppWorkerModule {}
