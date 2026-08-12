import { describe, it, expect, jest } from '@jest/globals';
import { BillingUsageAggregationCron } from './billing-usage-aggregation.cron';
import { UsageAggregationService } from '@/domains/billing/core/services/usage-aggregation.service';
import { CRON_SCHEDULES } from '@/shared/schedule/cron-schedules';
import { getHeartbeatName } from '@/shared/modules/schedule/cron-heartbeat';

describe('BillingUsageAggregationCron', () => {
  const usageAggregationService = {
    runDailyUsageAggregation: jest
      .fn<() => Promise<void>>()
      .mockResolvedValue(undefined),
  } as unknown as UsageAggregationService;

  const cron = new BillingUsageAggregationCron(usageAggregationService);

  it('is wired to the BILLING_USAGE_AGGREGATION schedule (30 min past midnight UTC)', () => {
    expect(CRON_SCHEDULES.BILLING_USAGE_AGGREGATION).toBe('30 0 * * *');
  });

  it('carries the billing.usage-aggregation heartbeat name on run()', () => {
    expect(getHeartbeatName(BillingUsageAggregationCron.prototype, 'run')).toBe(
      'billing.usage-aggregation',
    );
  });

  it('delegates run() to UsageAggregationService.runDailyUsageAggregation', async () => {
    await cron.run();

    expect(
      usageAggregationService.runDailyUsageAggregation,
    ).toHaveBeenCalledTimes(1);
  });
});
