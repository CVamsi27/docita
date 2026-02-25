import { Module } from '@nestjs/common';
import { PatientService } from './application/services/patient.service';
import { PatientsController } from './presentation/controllers/patients.controller';
import { MedicalHistoryController } from './presentation/controllers/medical-history.controller';
import { MedicalHistoryService } from './application/services/medical-history.service';
import { PrismaPatientRepository } from './infrastructure/persistence/prisma-patient.repository';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../../shared/modules/auth/auth/auth.module';
import { AuditModule } from '../../shared/modules/audit/audit/audit.module';
import { MedicalHistoryFactory } from './core/factories/medical-history.factory';
import { VitalsFactory } from './core/factories/vitals.factory';
import { AiModule } from '../../shared/modules/ai-core/ai.module';

@Module({
  imports: [PrismaModule, AuthModule, AuditModule, AiModule],
  controllers: [PatientsController, MedicalHistoryController],
  providers: [
    PatientService,
    MedicalHistoryService,
    PrismaPatientRepository,
    {
      provide: 'IPatientRepository',
      useClass: PrismaPatientRepository,
    },
    MedicalHistoryFactory,
    VitalsFactory,
  ],
  exports: [PatientService, 'IPatientRepository', VitalsFactory],
})
export class PatientsModule {}
