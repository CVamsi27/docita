import { Module } from '@nestjs/common';
import { PrismaWorkerModule } from '@/prisma/prisma.worker.module';
import { WhatsAppWorkerModule } from '@/domains/whatsapp/whatsapp.worker.module';
import { WhatsappCampaignDispatchCron } from '@/domains/whatsapp/whatsapp-campaign-dispatch.cron';

@Module({
  imports: [PrismaWorkerModule, WhatsAppWorkerModule],
  providers: [WhatsappCampaignDispatchCron],
})
export class WhatsappCampaignWorkerModule {}
