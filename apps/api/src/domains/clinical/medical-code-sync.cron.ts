import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MedicalCodeSyncService } from './application/services/medical-code-sync.service';
import { isCronDisabledInThisProcess } from '@/shared/schedule/cron-env';

@Injectable()
export class MedicalCodeSyncCron {
  constructor(
    private readonly medicalCodeSyncService: MedicalCodeSyncService,
  ) {}

  @Cron('0 4 * * *', { disabled: isCronDisabledInThisProcess() })
  async run(): Promise<void> {
    await this.medicalCodeSyncService.syncCommonCodes();
  }
}
