import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { isCronDisabledInThisProcess } from '@/shared/schedule/cron-env';
import { CRON_SCHEDULES } from '@/shared/schedule/cron-schedules';
import { TrackHeartbeat } from '@/shared/modules/schedule/cron-heartbeat';
import { PaymentCaptureReconciliationService } from '@/domains/billing/application/services/payment-capture-reconciliation.service';

@Injectable()
export class PaymentCaptureReconciliationCron {
  private readonly logger = new Logger(PaymentCaptureReconciliationCron.name);

  constructor(
    private readonly reconciliation: PaymentCaptureReconciliationService,
  ) {}

  @Cron(CRON_SCHEDULES.PAYMENT_CAPTURE_RECONCILIATION, {
    disabled: isCronDisabledInThisProcess(),
  })
  @TrackHeartbeat('billing.payment-capture-reconciliation')
  async run(): Promise<void> {
    try {
      await this.reconciliation.reconcileRecentCaptures();
    } catch (error) {
      this.logger.error(
        'Payment capture reconciliation cron failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
