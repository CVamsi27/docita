import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SchedulerService } from '@/domains/billing/application/services/scheduler.service';
import { isCronDisabledInThisProcess } from '@/shared/schedule/cron-env';

@Injectable()
export class BillingScheduledPaymentRemindersCron {
  constructor(private readonly schedulerService: SchedulerService) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM, {
    disabled: isCronDisabledInThisProcess(),
  })
  async run(): Promise<void> {
    await this.schedulerService.runScheduledPaymentReminders();
  }
}
