import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { CommonServicesModule } from '@/shared/modules/services/common-services.module';
import { BillingModule } from '@/domains/billing/billing.module';
import { DocumentsModule } from '@/domains/documents/documents.module';
import { QueueModule } from '@/shared/modules/queue/queue.module';
import { PrescriptionsController } from './presentation/controllers/prescription.controller';
import { PrescriptionsService } from './application/services/prescription.service';
import { PrescriptionsCommandService } from './application/services/prescriptions-command.service';
import { PrescriptionsQueryService } from './application/services/prescriptions-query.service';
import { PrescriptionPdfService } from './application/services/prescription-pdf.service';
import { PrescriptionPdfOrchestratorService } from './application/services/prescription-pdf-orchestrator.service';
import { PrescriptionPdfProcessor } from './application/services/prescription-pdf.processor';
import { PDF_JOB_PROCESSOR_PRISMA_TOKEN } from '@/shared/modules/queue/pdf-job.service';
import { PrismaPrescriptionRepository } from './infrastructure/repositories/prescription.repository';
import { SignatureImageClient } from './infrastructure/external/signature-image.client';
import { FrontDeskClinicalBlockGuard } from '@/shared/modules/clinic-workspace/front-desk-clinical-block.guard';
import { AuditModule } from '@/shared/modules/audit/audit/audit.module';

@Module({
  imports: [
    PrismaModule,
    CommonServicesModule,
    forwardRef(() => BillingModule),
    DocumentsModule,
    QueueModule,
    AuditModule,
  ],
  controllers: [PrescriptionsController],
  providers: [
    FrontDeskClinicalBlockGuard,
    SignatureImageClient,
    PrescriptionsQueryService,
    PrescriptionsCommandService,
    PrescriptionsService,
    PrescriptionPdfService,
    PrescriptionPdfOrchestratorService,
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
  exports: [
    PrescriptionsQueryService,
    PrescriptionsCommandService,
    PrescriptionsService,
    PrescriptionPdfService,
    PrescriptionPdfOrchestratorService,
  ],
})
export class PrescriptionsModule {}
