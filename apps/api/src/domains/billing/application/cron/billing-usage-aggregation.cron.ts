import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { UsageAggregationService } from '@/domains/billing/core/services/usage-aggregation.service';
import { isCronDisabledInThisProcess } from '@/shared/schedule/cron-env';

@Injectable()
export class BillingUsageAggregationCron {
  constructor(
    private readonly usageAggregationService: UsageAggregationService,
  ) {}

  @Cron('30 0 * * *', { disabled: isCronDisabledInThisProcess() })
  async run(): Promise<void> {
    await this.usageAggregationService.runDailyUsageAggregation();
  }
}
