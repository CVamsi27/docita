import { Inject, Injectable, Logger } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { Cron } from '@nestjs/schedule';
import { isCronDisabledInThisProcess } from '@/shared/schedule/cron-env';
import { CRON_SCHEDULES } from '@/shared/schedule/cron-schedules';
import { TrackHeartbeat } from '@/shared/modules/schedule/cron-heartbeat';
import { isDatabaseAuthError } from '@/shared/modules/auth/auth/auth-database.util';
import { BillMonthlyOveragesUseCase } from '@/domains/subscriptions/application/use-cases/bill-monthly-overages.use-case';
import { NotifyUsageThresholdsUseCase } from '@/domains/subscriptions/application/use-cases/notify-usage-thresholds.use-case';
import { getPreviousUtcMonthRange } from '@/shared/schedule/scheduler-date.util';

@Injectable()
export class OverageBillingScheduler {
  private readonly logger = new Logger(OverageBillingScheduler.name);
  private databaseAccessDisabled = false;

  constructor(
    private readonly billMonthlyOveragesUseCase: BillMonthlyOveragesUseCase,
    private readonly notifyUsageThresholdsUseCase: NotifyUsageThresholdsUseCase,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  @Cron(CRON_SCHEDULES.OVERAGE_BILLING_MONTHLY, {
    disabled: isCronDisabledInThisProcess(),
  })
  @TrackHeartbeat('subscriptions.overage-billing-monthly')
  async billMonthlyOverages(): Promise<void> {
    if (this.databaseAccessDisabled) return;

    const { periodStart, periodEnd } = getPreviousUtcMonthRange(
      this.clock.now(),
    );

    this.logger.log(
      `Running monthly overage billing for ${periodStart.toISOString().slice(0, 7)}`,
    );

    try {
      await this.billMonthlyOveragesUseCase.execute({ periodStart, periodEnd });
    } catch (error) {
      if (isDatabaseAuthError(error)) {
        this.databaseAccessDisabled = true;
        this.logger.warn(
          'Disabling overage scheduler due to database authentication failure.',
        );
        return;
      }
      this.logger.error('Monthly overage billing cron failed', error);
    }
  }

  @Cron(CRON_SCHEDULES.OVERAGE_USAGE_THRESHOLDS, {
    disabled: isCronDisabledInThisProcess(),
  })
  @TrackHeartbeat('subscriptions.usage-thresholds')
  async notifyUsageThresholds(): Promise<void> {
    if (this.databaseAccessDisabled) return;

    try {
      await this.notifyUsageThresholdsUseCase.execute();
    } catch (error) {
      if (isDatabaseAuthError(error)) {
        this.databaseAccessDisabled = true;
        this.logger.warn(
          'Disabling usage warning scheduler due to database authentication failure.',
        );
        return;
      }
      this.logger.error('Usage warning cron failed', error);
    }
  }
}
