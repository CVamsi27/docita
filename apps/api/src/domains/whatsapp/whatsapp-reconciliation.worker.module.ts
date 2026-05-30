import { Module } from '@nestjs/common';
import { WhatsappReconciliationService } from './application/services/whatsapp-reconciliation.service';
import { WHATSAPP_RECONCILIATION_REPOSITORY_TOKEN } from './core/repositories/whatsapp-reconciliation.repository.interface';
import { PrismaWhatsappReconciliationRepository } from './infrastructure/repositories/prisma-whatsapp-reconciliation.repository';
import { PrismaWorkerModule } from '@/prisma/prisma.worker.module';
import { WhatsappReconciliationCron } from './whatsapp-reconciliation.cron';

/**
 * Worker-only WhatsApp delivery reconciliation sweep (avoids importing the full
 * WhatsappModule). Non-destructive: surfaces stuck outbound messages.
 */
@Module({
  imports: [PrismaWorkerModule],
  providers: [
    WhatsappReconciliationService,
    WhatsappReconciliationCron,
    {
      provide: WHATSAPP_RECONCILIATION_REPOSITORY_TOKEN,
      useClass: PrismaWhatsappReconciliationRepository,
    },
  ],
})
export class WhatsappReconciliationWorkerModule {}
