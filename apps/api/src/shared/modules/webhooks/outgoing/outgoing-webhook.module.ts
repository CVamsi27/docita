import { Module, Global } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { OutgoingWebhookRepository } from './outgoing-webhook.repository';
import { OutgoingWebhookService } from './outgoing-webhook.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [OutgoingWebhookRepository, OutgoingWebhookService],
  exports: [OutgoingWebhookService],
})
export class OutgoingWebhookModule {}
