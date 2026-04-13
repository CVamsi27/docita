import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SendMessageUseCase } from './application/use-cases/send-message.use-case';
import { WhatsAppQueryService } from './application/services/whatsapp-query.service';
import { WhatsAppAutomationService } from './application/services/whatsapp-automation.service';
import { WHATSAPP_REPOSITORY_TOKEN } from './application/ports/whatsapp.repository.port';
import { WHATSAPP_CLIENT_TOKEN } from './application/ports/whatsapp-client.port';
import { PrismaWhatsAppRepository } from './infrastructure/repositories/prisma-whatsapp.repository';
import { WhatsAppApiAdapter } from './infrastructure/adapters/whatsapp-api.adapter';
import { PrismaWorkerModule } from '@/prisma/prisma.worker.module';
import { DefaultTemplatesService } from './core/services/default-templates.service';
import { TemplateResolverService } from './core/services/template-resolver.service';

@Global()
@Module({
  imports: [PrismaWorkerModule, ConfigModule],
  providers: [
    SendMessageUseCase,
    WhatsAppQueryService,
    WhatsAppAutomationService,
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
    WHATSAPP_REPOSITORY_TOKEN,
    DefaultTemplatesService,
    TemplateResolverService,
  ],
})
export class WhatsAppWorkerModule {}
