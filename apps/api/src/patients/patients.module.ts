import { Module } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { MedicalHistoryController } from './medical-history.controller';
import { MedicalHistoryService } from './medical-history.service';

@Module({
  controllers: [PatientsController, MedicalHistoryController],
  providers: [PatientsService, MedicalHistoryService],
})
export class PatientsModule {}
