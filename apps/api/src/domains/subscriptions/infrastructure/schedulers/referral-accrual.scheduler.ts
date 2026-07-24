import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { isCronDisabledInThisProcess } from '@/shared/schedule/cron-env';
import { CRON_SCHEDULES } from '@/shared/schedule/cron-schedules';
import { TrackHeartbeat } from '@/shared/modules/schedule/cron-heartbeat';
import { isDatabaseAuthError } from '@/shared/modules/auth/auth/auth-database.util';
import { ReferralAccrualService } from '@/domains/subscriptions/application/services/referral-accrual.service';

/**
 * Daily trigger for revenue-share referral accrual. The heavy lifting (and all
 * idempotency) lives in ReferralAccrualService / ReferralPayoutService; this only
 * schedules it and degrades gracefully on DB auth loss.
 */
@Injectable()
export class ReferralAccrualScheduler {
  private readonly logger = new Logger(ReferralAccrualScheduler.name);
  private databaseAccessDisabled = false;

  constructor(private readonly accrualService: ReferralAccrualService) {}

  @Cron(CRON_SCHEDULES.REFERRAL_ACCRUAL, {
    disabled: isCronDisabledInThisProcess(),
  })
  @TrackHeartbeat('subscriptions.referral-accrual')
  async accrueReferralPayouts(): Promise<void> {
    if (this.databaseAccessDisabled) return;

    try {
      const { referralsProcessed, payoutsCreated } =
        await this.accrualService.accrueAllDuePayouts();
      if (payoutsCreated > 0) {
        this.logger.log(
          `Referral accrual created ${payoutsCreated} payout(s) across ${referralsProcessed} referral(s)`,
        );
      }
    } catch (error) {
      if (isDatabaseAuthError(error)) {
        this.databaseAccessDisabled = true;
        this.logger.warn(
          'Disabling referral accrual scheduler due to database authentication failure.',
        );
        return;
      }
      this.logger.error('Referral accrual cron failed', error);
    }
  }
}
