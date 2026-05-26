import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { UsageAggregationService } from '@/domains/billing/core/services/usage-aggregation.service';
import { isCronDisabledInThisProcess } from '@/shared/schedule/cron-env';
import { CRON_SCHEDULES } from '@/shared/schedule/cron-schedules';
import { TrackHeartbeat } from '@/shared/modules/schedule/cron-heartbeat';

@Injectable()
export class BillingUsageAggregationCron {
  constructor(
    private readonly usageAggregationService: UsageAggregationService,
  ) {}

  @Cron(CRON_SCHEDULES.BILLING_USAGE_AGGREGATION, {
    disabled: isCronDisabledInThisProcess(),
  })
  @TrackHeartbeat('billing.usage-aggregation')
  async run(): Promise<void> {
    await this.usageAggregationService.runDailyUsageAggregation();
  }
}
