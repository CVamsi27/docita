import { Module } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { MedicalHistoryController } from './medical-history.controller';
import { MedicalHistoryService } from './medical-history.service';
import { PatientsRepository } from '../../common/repositories';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../../shared/modules/auth/auth/auth.module';
import { AuditModule } from '../../shared/modules/audit/audit/audit.module';
import { MedicalHistoryFactory } from './factories/medical-history.factory';
import { VitalsFactory } from './factories/vitals.factory';
import { AiModule } from '../../shared/modules/ai-core/ai.module';
@Module({
  imports: [PrismaModule, AuthModule, AuditModule, AiModule],
  controllers: [PatientsController, MedicalHistoryController],
  providers: [
    PatientsService,
    MedicalHistoryService,
    PatientsRepository,
    MedicalHistoryFactory,
    VitalsFactory,
  ],
  exports: [PatientsService, PatientsRepository, VitalsFactory],
})
export class PatientsModule {}
