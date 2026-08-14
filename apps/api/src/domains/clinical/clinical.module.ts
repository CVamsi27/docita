import { Module } from '@nestjs/common';
import { LabTestsController } from './presentation/controllers/lab-tests.controller';
import { LabWorkflowController } from './presentation/controllers/lab-workflow.controller';
import { MedicalCodingController } from './presentation/controllers/medical-coding.controller';
import { ClinicalService } from './application/services/clinical.service';
import { LabWorkflowCommandService } from './application/services/lab-workflow-command.service';
import { LabWorkflowQueryService } from './application/services/lab-workflow-query.service';
import { ClinicalSettingsService } from './application/services/clinical-settings.service';
import { PrismaLabRepository } from './infrastructure/persistence/prisma-lab.repository';
import { PrismaClinicalSettingsRepository } from './infrastructure/persistence/prisma-clinical-settings.repository';
import { PrismaMedicalCodingRepository } from './infrastructure/persistence/prisma-medical-coding.repository';
import { NlmCodingClient } from './infrastructure/external/nlm-coding.client';
import { NlmCodeCatalogProvider } from './infrastructure/external/nlm-code-catalog.provider';
import { LicensedCptCodeCatalogProvider } from './infrastructure/external/licensed-cpt-code-catalog.provider';
import { CompositeCodeCatalogProvider } from './infrastructure/external/composite-code-catalog.provider';
import { PrismaModule } from '@/prisma/prisma.module';
import { FrontDeskClinicalBlockGuard } from '@/shared/modules/clinic-workspace/front-desk-clinical-block.guard';
import { ClinicalFactory } from './application/factories/clinical.factory';
import { CODE_CATALOG_PROVIDER } from './core/providers/code-catalog.provider';
import { CLINICAL_SETTINGS_REPOSITORY_TOKEN } from './core/repositories/clinical-settings.repository.interface';
import { AuditModule } from '@/shared/modules/audit/audit/audit.module';
import { AuthModule } from '@/shared/modules/auth/auth/auth.module';
import { DocumentsModule } from '@/domains/documents/documents.module';
import { WhatsAppModule } from '@/domains/whatsapp/whatsapp.module';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    AuthModule,
    DocumentsModule,
    WhatsAppModule,
  ],
  controllers: [
    // Literal routes before parameterized ones: LabWorkflowController's
    // `GET /clinical/lab-tests/queue` and `GET /clinical/lab-tests/labs` must
    // win over LabTestsController's `GET /clinical/lab-tests/:id` (Express
    // matches by registration order), so the literal-route controller
    // registers first.
    LabWorkflowController,
    LabTestsController,
    MedicalCodingController,
  ],
  providers: [
    FrontDeskClinicalBlockGuard,
    ClinicalService,
    LabWorkflowCommandService,
    LabWorkflowQueryService,
    ClinicalSettingsService,
    ClinicalFactory,
    PrismaLabRepository,
    NlmCodingClient,
    NlmCodeCatalogProvider,
    LicensedCptCodeCatalogProvider,
    CompositeCodeCatalogProvider,
    {
      provide: CODE_CATALOG_PROVIDER,
      useExisting: CompositeCodeCatalogProvider,
    },
    {
      provide: 'ILabRepository',
      useExisting: PrismaLabRepository,
    },
    {
      provide: 'LabTestCatalogRepository',
      useExisting: PrismaLabRepository,
    },
    {
      provide: 'LabOrderRepository',
      useExisting: PrismaLabRepository,
    },
    {
      provide: 'LabWorkflowRepository',
      useExisting: PrismaLabRepository,
    },
    {
      provide: 'LabDirectoryRepository',
      useExisting: PrismaLabRepository,
    },
    {
      provide: 'IMedicalCodingRepository',
      useClass: PrismaMedicalCodingRepository,
    },
    {
      provide: CLINICAL_SETTINGS_REPOSITORY_TOKEN,
      useClass: PrismaClinicalSettingsRepository,
    },
  ],
  exports: [ClinicalService, CODE_CATALOG_PROVIDER, 'IMedicalCodingRepository'],
})
export class ClinicalModule {}
