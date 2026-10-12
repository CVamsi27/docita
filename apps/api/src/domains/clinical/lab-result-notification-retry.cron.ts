import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LabResultReleaseService } from './application/services/lab-result-release.service';
import { isCronDisabledInThisProcess } from '@/shared/schedule/cron-env';
import { CRON_SCHEDULES } from '@/shared/schedule/cron-schedules';
import { TrackHeartbeat } from '@/shared/modules/schedule/cron-heartbeat';

/**
 * Recovery sweep for releases whose notification was claimed but never
 * settled (worker crash, provider timeout, WhatsApp outage). Without a caller
 * those orders stay permanently "notification pending" while reading as
 * released, so the release path alone cannot be the only driver.
 */
@Injectable()
export class LabResultNotificationRetryCron {
  constructor(
    private readonly labResultReleaseService: LabResultReleaseService,
  ) {}

  @Cron(CRON_SCHEDULES.LAB_RESULT_NOTIFICATION_RETRY, {
    disabled: isCronDisabledInThisProcess(),
  })
  @TrackHeartbeat('clinical.lab-result-notification-retry')
  async run(): Promise<void> {
    await this.labResultReleaseService.retryPendingNotifications();
  }
}
