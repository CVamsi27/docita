import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MedicalCodeSyncService } from './application/services/medical-code-sync.service';
import { isCronDisabledInThisProcess } from '@/shared/schedule/cron-env';
import { CRON_SCHEDULES } from '@/shared/schedule/cron-schedules';

@Injectable()
export class MedicalCodeSyncCron {
  constructor(
    private readonly medicalCodeSyncService: MedicalCodeSyncService,
  ) {}

  @Cron(CRON_SCHEDULES.MEDICAL_CODE_SYNC, {
    disabled: isCronDisabledInThisProcess(),
  })
  async run(): Promise<void> {
    await this.medicalCodeSyncService.syncCommonCodes();
  }
}
