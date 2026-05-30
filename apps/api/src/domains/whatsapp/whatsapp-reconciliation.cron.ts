import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { WhatsappReconciliationService } from './application/services/whatsapp-reconciliation.service';
import { isCronDisabledInThisProcess } from '@/shared/schedule/cron-env';
import { CRON_SCHEDULES } from '@/shared/schedule/cron-schedules';
import { TrackHeartbeat } from '@/shared/modules/schedule/cron-heartbeat';

/**
 * Hourly sweep that surfaces outbound WhatsApp messages stuck in a non-final
 * delivery status. Worker-only; disabled in the API process.
 */
@Injectable()
export class WhatsappReconciliationCron {
  constructor(
    private readonly reconciliationService: WhatsappReconciliationService,
  ) {}

  @Cron(CRON_SCHEDULES.WHATSAPP_DELIVERY_RECONCILIATION, {
    disabled: isCronDisabledInThisProcess(),
  })
  @TrackHeartbeat('whatsapp.delivery-reconciliation')
  async run(): Promise<void> {
    await this.reconciliationService.runStaleDeliverySweep();
  }
}
