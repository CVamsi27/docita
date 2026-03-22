import { Module } from '@nestjs/common';
import { MedicalDocumentsController } from './medical-documents.controller';
import { MedicalDocumentsService } from './medical-documents.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { MEDICAL_DOCUMENTS_REPOSITORY_TOKEN } from './core/repositories/medical-documents.repository.interface';
import { PrismaMedicalDocumentsRepository } from './infrastructure/repositories/prisma-medical-documents.repository';

@Module({
  imports: [PrismaModule],
  controllers: [MedicalDocumentsController],
  providers: [
    MedicalDocumentsService,
    {
      provide: MEDICAL_DOCUMENTS_REPOSITORY_TOKEN,
      useClass: PrismaMedicalDocumentsRepository,
    },
  ],
  exports: [MedicalDocumentsService],
})
export class MedicalDocumentsModule {}
