import { Module } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { MedicalHistoryController } from './medical-history.controller';
import { MedicalHistoryService } from './medical-history.service';
import { PatientsRepository } from '../common/repositories';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PatientsController, MedicalHistoryController],
  providers: [PatientsService, MedicalHistoryService, PatientsRepository],
  exports: [PatientsService, PatientsRepository],
})
export class PatientsModule {}
