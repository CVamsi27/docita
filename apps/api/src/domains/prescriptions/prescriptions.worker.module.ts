import { Module, forwardRef } from '@nestjs/common';
import { PrismaWorkerModule } from '@/prisma/prisma.worker.module';
import { PrismaService } from '@/prisma/prisma.service';
import { BillingWorkerModule } from '@/domains/billing/billing.worker.module';
import { DocumentsWorkerModule } from '@/domains/documents/documents.worker.module';
import { QueueWorkerModule } from '@/shared/modules/queue/queue.worker.module';
import { PrescriptionsService } from './application/services/prescription.service';
import { PrescriptionsCommandService } from './application/services/prescriptions-command.service';
import { PrescriptionsQueryService } from './application/services/prescriptions-query.service';
import { PrescriptionPdfOrchestratorService } from './application/services/prescription-pdf-orchestrator.service';
import { PrescriptionPdfService } from './application/services/prescription-pdf.service';
import { PrescriptionPdfProcessor } from './application/services/prescription-pdf.processor';
import { PDF_JOB_PROCESSOR_PRISMA_TOKEN } from '@/shared/modules/queue/pdf-job.service';
import { PrismaPrescriptionRepository } from './infrastructure/repositories/prescription.repository';
import { SignatureImageClient } from './infrastructure/external/signature-image.client';

@Module({
  imports: [
    PrismaWorkerModule,
    forwardRef(() => BillingWorkerModule),
    DocumentsWorkerModule,
    QueueWorkerModule,
  ],
  providers: [
    SignatureImageClient,
    PrescriptionsQueryService,
    PrescriptionsCommandService,
    PrescriptionsService,
    PrescriptionPdfOrchestratorService,
// jscpd:ignore-start
    PrescriptionPdfService,
    PrescriptionPdfProcessor,
    {
      provide: PDF_JOB_PROCESSOR_PRISMA_TOKEN,
      useExisting: PrismaService,
    },
    {
      provide: 'IPrescriptionRepository',
      useClass: PrismaPrescriptionRepository,
    },
  ],
  exports: [PrescriptionsService, PrescriptionPdfService],
// jscpd:ignore-end
})
export class PrescriptionsWorkerModule {}
