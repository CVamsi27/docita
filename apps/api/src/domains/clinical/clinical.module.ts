import { Module } from '@nestjs/common';
import { LabTestsController } from './presentation/controllers/lab-tests.controller';
import { MedicalCodingController } from './presentation/controllers/medical-coding.controller';
import { ClinicalService } from './application/services/clinical.service';
import { PrismaClinicalRepository } from './infrastructure/persistence/prisma-clinical.repository';
import { NlmCodingService } from './infrastructure/external/nlm-coding.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { ClinicalFactory } from './application/factories/clinical.factory';

@Module({
  imports: [PrismaModule],
  controllers: [LabTestsController, MedicalCodingController],
  providers: [
    ClinicalService,
    ClinicalFactory,
    NlmCodingService,
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
