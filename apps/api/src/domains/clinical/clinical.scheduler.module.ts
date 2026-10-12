import { Module } from '@nestjs/common';
import { ClinicalModule } from './clinical.module';
import { MedicalCodeSyncRunnerService } from './application/services/medical-code-sync-runner.service';
import { MedicalCodeSyncService } from './application/services/medical-code-sync.service';
import { MedicalCodeSyncCron } from './medical-code-sync.cron';
import { LabResultNotificationRetryCron } from './lab-result-notification-retry.cron';

@Module({
  imports: [ClinicalModule],
  providers: [
    MedicalCodeSyncRunnerService,
    MedicalCodeSyncService,
    MedicalCodeSyncCron,
    LabResultNotificationRetryCron,
  ],
})
export class ClinicalSchedulerModule {}
