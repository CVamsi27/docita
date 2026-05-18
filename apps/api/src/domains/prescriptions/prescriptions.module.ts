import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { CommonServicesModule } from '@/shared/modules/services/common-services.module';
import { BillingModule } from '@/domains/billing/billing.module';
import { DocumentsModule } from '@/domains/documents/documents.module';
import { QueueModule } from '@/shared/modules/queue/queue.module';
import { PrescriptionsController } from './presentation/controllers/prescription.controller';
import { PrescriptionsService } from './application/services/prescription.service';
import { PrescriptionPdfService } from './application/services/prescription-pdf.service';
import { PrescriptionPdfOrchestratorService } from './application/services/prescription-pdf-orchestrator.service';
import { PrescriptionPdfProcessor } from './application/services/prescription-pdf.processor';
import { PrismaPrescriptionRepository } from './infrastructure/repositories/prescription.repository';
import { FrontDeskClinicalBlockGuard } from '@/shared/modules/clinic-workspace/front-desk-clinical-block.guard';

@Module({
  imports: [
    PrismaModule,
    CommonServicesModule,
    forwardRef(() => BillingModule),
    DocumentsModule,
    QueueModule,
  ],
  controllers: [PrescriptionsController],
  providers: [
    FrontDeskClinicalBlockGuard,
    PrescriptionsService,
    PrescriptionPdfService,
    PrescriptionPdfOrchestratorService,
    PrescriptionPdfProcessor,
    {
      provide: 'IPrescriptionRepository',
      useClass: PrismaPrescriptionRepository,
    },
  ],
  exports: [
    PrescriptionsService,
    PrescriptionPdfService,
    PrescriptionPdfOrchestratorService,
  ],
})
export class PrescriptionsModule {}
