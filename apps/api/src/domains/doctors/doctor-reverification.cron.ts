import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DoctorVerificationService } from './application/services/doctor-verification.service';
import { isCronDisabledInThisProcess } from '@/shared/schedule/cron-env';
import { CRON_SCHEDULES } from '@/shared/schedule/cron-schedules';
import { TrackHeartbeat } from '@/shared/modules/schedule/cron-heartbeat';

@Injectable()
export class DoctorReverificationCron {
  constructor(
    private readonly doctorVerificationService: DoctorVerificationService,
  ) {}

  @Cron(CRON_SCHEDULES.DOCTOR_REVERIFICATION, {
    disabled: isCronDisabledInThisProcess(),
  })
  @TrackHeartbeat('doctors.reverification')
  async run(): Promise<void> {
    await this.doctorVerificationService.runDoctorReverificationSweep();
  }
}
