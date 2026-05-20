import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SchedulerService } from '@/domains/billing/application/services/scheduler.service';
import { isCronDisabledInThisProcess } from '@/shared/schedule/cron-env';
import { CRON_SCHEDULES } from '@/shared/schedule/cron-schedules';

@Injectable()
export class BillingScheduledPaymentRemindersCron {
  constructor(private readonly schedulerService: SchedulerService) {}

  @Cron(CRON_SCHEDULES.BILLING_PAYMENT_REMINDERS, {
    disabled: isCronDisabledInThisProcess(),
  })
  async run(): Promise<void> {
    await this.schedulerService.runScheduledPaymentReminders();
  }
}
