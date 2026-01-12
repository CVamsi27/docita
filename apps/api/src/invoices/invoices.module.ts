import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WhatsappModule } from '../modules/whatsapp/whatsapp.module';
import { PaymentsModule } from '../modules/payments/payments.module';
import { CommonServicesModule } from '../common/services/common-services.module';

@Module({
  imports: [PrismaModule, WhatsappModule, PaymentsModule, CommonServicesModule],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
