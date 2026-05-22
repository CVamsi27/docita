import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DoctorVerificationService } from './application/services/doctor-verification.service';
import { isCronDisabledInThisProcess } from '@/shared/schedule/cron-env';
import { CRON_SCHEDULES } from '@/shared/schedule/cron-schedules';

@Injectable()
export class DoctorReverificationCron {
  constructor(
    private readonly doctorVerificationService: DoctorVerificationService,
  ) {}

  @Cron(CRON_SCHEDULES.DOCTOR_REVERIFICATION, {
    disabled: isCronDisabledInThisProcess(),
  })
  async run(): Promise<void> {
    await this.doctorVerificationService.runDoctorReverificationSweep();
  }
}
