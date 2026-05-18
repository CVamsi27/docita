import { Module, forwardRef } from '@nestjs/common';
import { PrismaWorkerModule } from '@/prisma/prisma.worker.module';
import { BillingWorkerModule } from '@/domains/billing/billing.worker.module';
import { DocumentsWorkerModule } from '@/domains/documents/documents.worker.module';
import { QueueWorkerModule } from '@/shared/modules/queue/queue.worker.module';
import { PrescriptionsService } from './application/services/prescription.service';
import { PrescriptionPdfService } from './application/services/prescription-pdf.service';
import { PrescriptionPdfProcessor } from './application/services/prescription-pdf.processor';
import { PrismaPrescriptionRepository } from './infrastructure/repositories/prescription.repository';

@Module({
  imports: [
    PrismaWorkerModule,
    forwardRef(() => BillingWorkerModule),
    DocumentsWorkerModule,
    QueueWorkerModule,
  ],
  providers: [
    PrescriptionsService,
    PrescriptionPdfService,
    PrescriptionPdfProcessor,
    {
      provide: 'IPrescriptionRepository',
      useClass: PrismaPrescriptionRepository,
    },
  ],
  exports: [PrescriptionsService, PrescriptionPdfService],
})
export class PrescriptionsWorkerModule {}
