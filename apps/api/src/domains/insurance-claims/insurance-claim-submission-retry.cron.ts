import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InsuranceClaimSubmissionCommandService } from './application/services/insurance-claim-submission.command.service';
import { isCronDisabledInThisProcess } from '@/shared/schedule/cron-env';
import { CRON_SCHEDULES } from '@/shared/schedule/cron-schedules';
import { TrackHeartbeat } from '@/shared/modules/schedule/cron-heartbeat';

/**
 * Recovery sweep for claims whose filing was claimed but never settled
 * (worker crash, insurer gateway timeout). Without a caller a claim stays
 * SUBMITTED with no transmission record, so a timer has to re-drive delivery.
 */
@Injectable()
export class InsuranceClaimSubmissionRetryCron {
  constructor(
    private readonly submissionService: InsuranceClaimSubmissionCommandService,
  ) {}

  @Cron(CRON_SCHEDULES.CLAIM_SUBMISSION_RETRY, {
    disabled: isCronDisabledInThisProcess(),
  })
  @TrackHeartbeat('insurance.claim-submission-retry')
  async run(): Promise<void> {
    await this.submissionService.retryPendingSubmissions();
  }
}
