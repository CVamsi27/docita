import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { SupportWhatsAppInboxService } from './support-whatsapp-inbox.service';

@Module({
  imports: [PrismaModule],
  providers: [SupportWhatsAppInboxService],
  exports: [SupportWhatsAppInboxService],
})
export class SupportWhatsAppModule {}
