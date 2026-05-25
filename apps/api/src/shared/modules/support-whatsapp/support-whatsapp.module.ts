import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { SupportWhatsAppInboxService } from './support-whatsapp-inbox.service';
import { SupportWhatsAppThreadQueryService } from './support-whatsapp-thread-query.service';
import { SupportWhatsAppReplyService } from './support-whatsapp-reply.service';
import { SupportWhatsAppWebhookIngestService } from './support-whatsapp-webhook-ingest.service';
import { WhatsappModule } from '@/domains/whatsapp/whatsapp-clinic.module';

@Module({
  imports: [PrismaModule, forwardRef(() => WhatsappModule)],
  providers: [
    SupportWhatsAppThreadQueryService,
    SupportWhatsAppReplyService,
    SupportWhatsAppWebhookIngestService,
    SupportWhatsAppInboxService,
  ],
  exports: [SupportWhatsAppInboxService],
})
export class SupportWhatsAppModule {}
