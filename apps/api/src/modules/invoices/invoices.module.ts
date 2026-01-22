import { Module } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { PaymentsModule } from '../payments/payments.module';
import { InvoiceEventsListener } from './events/invoice-events.listener'; // Import listener

@Module({
  imports: [PrismaModule, PaymentsModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoiceEventsListener], // Add listener to providers
  exports: [InvoicesService],
})
export class InvoicesModule {}
