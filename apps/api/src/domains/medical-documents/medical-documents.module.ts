import { Module } from '@nestjs/common';
import { MedicalDocumentsController } from './presentation/controllers/medical-documents.controller';
import { MedicalDocumentsService } from './application/services/medical-documents.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { MEDICAL_DOCUMENTS_REPOSITORY_TOKEN } from './core/repositories/medical-documents.repository.interface';
import { PrismaMedicalDocumentsRepository } from './infrastructure/repositories/prisma-medical-documents.repository';
import { FrontDeskClinicalBlockGuard } from '@/shared/modules/clinic-workspace/front-desk-clinical-block.guard';

@Module({
  imports: [PrismaModule],
  controllers: [MedicalDocumentsController],
  providers: [
    FrontDeskClinicalBlockGuard,
    MedicalDocumentsService,
    {
      provide: MEDICAL_DOCUMENTS_REPOSITORY_TOKEN,
      useClass: PrismaMedicalDocumentsRepository,
    },
  ],
  exports: [MedicalDocumentsService],
})
export class MedicalDocumentsModule {}
