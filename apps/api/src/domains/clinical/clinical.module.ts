import { Module } from '@nestjs/common';
import { LabTestsController } from './presentation/controllers/lab-tests.controller';
import { MedicalCodingController } from './presentation/controllers/medical-coding.controller';
import { ClinicalService } from './application/services/clinical.service';
import { ClinicalSettingsService } from './application/services/clinical-settings.service';
import { PrismaLabRepository } from './infrastructure/persistence/prisma-lab.repository';
import { PrismaClinicalSettingsRepository } from './infrastructure/persistence/prisma-clinical-settings.repository';
import { PrismaMedicalCodingRepository } from './infrastructure/persistence/prisma-medical-coding.repository';
import { NlmCodingService } from './infrastructure/external/nlm-coding.service';
import { NlmCodeCatalogProvider } from './infrastructure/external/nlm-code-catalog.provider';
import { LicensedCptCodeCatalogProvider } from './infrastructure/external/licensed-cpt-code-catalog.provider';
import { CompositeCodeCatalogProvider } from './infrastructure/external/composite-code-catalog.provider';
import { PrismaModule } from '@/prisma/prisma.module';
import { FrontDeskClinicalBlockGuard } from '@/shared/modules/clinic-workspace/front-desk-clinical-block.guard';
import { ClinicalFactory } from './application/factories/clinical.factory';
import { CODE_CATALOG_PROVIDER } from './core/providers/code-catalog.provider';
import { CLINICAL_SETTINGS_REPOSITORY_TOKEN } from './core/repositories/clinical-settings.repository.interface';
import { AuditModule } from '@/shared/modules/audit/audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [LabTestsController, MedicalCodingController],
  providers: [
    FrontDeskClinicalBlockGuard,
    ClinicalService,
    ClinicalSettingsService,
    ClinicalFactory,
    NlmCodingService,
    NlmCodeCatalogProvider,
    LicensedCptCodeCatalogProvider,
    CompositeCodeCatalogProvider,
    {
      provide: CODE_CATALOG_PROVIDER,
      useExisting: CompositeCodeCatalogProvider,
    },
    {
      provide: 'ILabRepository',
      useClass: PrismaLabRepository,
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
  exports: [ClinicalService, CODE_CATALOG_PROVIDER],
})
export class ClinicalModule {}
