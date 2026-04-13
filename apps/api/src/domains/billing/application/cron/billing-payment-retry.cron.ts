import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RetryService } from '@/domains/billing/application/services/retry.service';
import { isCronDisabledInThisProcess } from '@/shared/schedule/cron-env';

@Injectable()
export class BillingPaymentRetryCron {
  constructor(private readonly retryService: RetryService) {}

  @Cron('*/30 * * * *', { disabled: isCronDisabledInThisProcess() })
  async run(): Promise<void> {
    await this.retryService.runPaymentRetrySweep();
  }
}
