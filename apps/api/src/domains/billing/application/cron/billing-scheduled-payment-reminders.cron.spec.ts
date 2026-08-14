import { describe, it, expect, jest } from '@jest/globals';
import { CronExpression } from '@nestjs/schedule';
import { BillingScheduledPaymentRemindersCron } from './billing-scheduled-payment-reminders.cron';
import { SchedulerService } from '@/domains/billing/application/services/scheduler.service';
import { CRON_SCHEDULES } from '@/shared/schedule/cron-schedules';
import { getHeartbeatName } from '@/shared/modules/schedule/cron-heartbeat';

describe('BillingScheduledPaymentRemindersCron', () => {
  const schedulerService = {
    runScheduledPaymentReminders: jest
      .fn<() => Promise<void>>()
      .mockResolvedValue(undefined),
  } as unknown as SchedulerService;

  const cron = new BillingScheduledPaymentRemindersCron(schedulerService);

  it('is wired to the BILLING_PAYMENT_REMINDERS schedule (1 AM daily)', () => {
    expect(CRON_SCHEDULES.BILLING_PAYMENT_REMINDERS).toBe(
      CronExpression.EVERY_DAY_AT_1AM,
    );
  });

  it('carries the billing.scheduled-payment-reminders heartbeat name on run()', () => {
    expect(
      getHeartbeatName(BillingScheduledPaymentRemindersCron.prototype, 'run'),
    ).toBe('billing.scheduled-payment-reminders');
  });

  it('delegates run() to SchedulerService.runScheduledPaymentReminders', async () => {
    await cron.run();

    expect(schedulerService.runScheduledPaymentReminders).toHaveBeenCalledTimes(
      1,
    );
  });
});
