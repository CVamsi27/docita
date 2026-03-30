import { Module } from '@nestjs/common';
import { LabTestsController } from './presentation/controllers/lab-tests.controller';
import { MedicalCodingController } from './presentation/controllers/medical-coding.controller';
import { ClinicalService } from './application/services/clinical.service';
import { MedicalCodeSyncService } from './application/services/medical-code-sync.service';
import { PrismaClinicalRepository } from './infrastructure/persistence/prisma-clinical.repository';
import { NlmCodingService } from './infrastructure/external/nlm-coding.service';
import { NlmCodeCatalogProvider } from './infrastructure/external/nlm-code-catalog.provider';
import { LicensedCptCodeCatalogProvider } from './infrastructure/external/licensed-cpt-code-catalog.provider';
import { CompositeCodeCatalogProvider } from './infrastructure/external/composite-code-catalog.provider';
import { PrismaModule } from '@/prisma/prisma.module';
import { ClinicalFactory } from './application/factories/clinical.factory';
import { CODE_CATALOG_PROVIDER } from './core/providers/code-catalog.provider';

@Module({
  imports: [PrismaModule],
  controllers: [LabTestsController, MedicalCodingController],
  providers: [
    ClinicalService,
    MedicalCodeSyncService,
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
      useClass: PrismaClinicalRepository,
    },
    {
      provide: 'IMedicalCodingRepository',
      useClass: PrismaClinicalRepository,
    },
  ],
  exports: [ClinicalService],
})
export class ClinicalModule {}
