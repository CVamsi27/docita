import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DoctorVerificationService } from './application/services/doctor-verification.service';
import { isCronDisabledInThisProcess } from '@/shared/schedule/cron-env';

@Injectable()
export class DoctorReverificationCron {
  constructor(
    private readonly doctorVerificationService: DoctorVerificationService,
  ) {}

  @Cron('15 4 * * *', { disabled: isCronDisabledInThisProcess() })
  async run(): Promise<void> {
    await this.doctorVerificationService.runDoctorReverificationSweep();
  }
}
