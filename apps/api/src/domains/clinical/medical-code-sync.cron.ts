import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MedicalCodeSyncService } from './application/services/medical-code-sync.service';
import { isCronDisabledInThisProcess } from '@/shared/schedule/cron-env';
import { CRON_SCHEDULES } from '@/shared/schedule/cron-schedules';
import { TrackHeartbeat } from '@/shared/modules/schedule/cron-heartbeat';

@Injectable()
export class MedicalCodeSyncCron {
  constructor(
    private readonly medicalCodeSyncService: MedicalCodeSyncService,
  ) {}

  @Cron(CRON_SCHEDULES.MEDICAL_CODE_SYNC, {
    disabled: isCronDisabledInThisProcess(),
  })
  @TrackHeartbeat('clinical.medical-code-sync')
  async run(): Promise<void> {
    await this.medicalCodeSyncService.syncCommonCodes();
  }
}
