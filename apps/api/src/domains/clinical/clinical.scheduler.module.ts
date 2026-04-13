import { Module } from '@nestjs/common';
import { ClinicalModule } from './clinical.module';
import { MedicalCodeSyncService } from './application/services/medical-code-sync.service';
import { MedicalCodeSyncCron } from './medical-code-sync.cron';

@Module({
  imports: [ClinicalModule],
  providers: [MedicalCodeSyncService, MedicalCodeSyncCron],
})
export class ClinicalSchedulerModule {}
