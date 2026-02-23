import { Module } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { PaymentsModule } from '../payments/payments.module';
import { InvoiceEventsListener } from './events/invoice-events.listener';
import { InvoicePdfService } from './invoice-pdf.service';
import { InvoiceCalculationRulesService } from './domain-services/invoice-calculation-rules.service';
import { CommonServicesModule } from '../../common/services/common-services.module';

import { PrismaInvoiceRepository } from './repositories/prisma-invoice.repository';

@Module({
  imports: [PrismaModule, PaymentsModule, CommonServicesModule],
  controllers: [InvoicesController],
  providers: [
    InvoicesService,
    InvoiceEventsListener,
    InvoicePdfService,
    InvoiceCalculationRulesService,
    {
      provide: 'IInvoiceRepository',
      useClass: PrismaInvoiceRepository,
    },
  ],
  exports: [InvoicesService, InvoicePdfService, InvoiceCalculationRulesService],
})
export class InvoicesModule {}
