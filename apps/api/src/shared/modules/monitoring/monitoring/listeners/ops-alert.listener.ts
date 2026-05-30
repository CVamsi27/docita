import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ApplicationEvents } from '@/shared/common/events/application-events';
import { OpsAlertService } from '@/shared/modules/monitoring/monitoring/services/ops-alert.service';

type WhatsappDeliveryStalePayload = {
  totalStale: number;
  groupCount: number;
};

@Injectable()
export class OpsAlertListener {
  constructor(private readonly opsAlert: OpsAlertService) {}

  @OnEvent(ApplicationEvents.WHATSAPP_DELIVERY_STALE, { async: true })
  async handleWhatsappDeliveryStale(
    payload: WhatsappDeliveryStalePayload,
  ): Promise<void> {
    await this.opsAlert.notify({
      title: 'WhatsApp delivery stale backlog',
      text:
        `${payload.totalStale} outbound message(s) across ${payload.groupCount} clinic/status group(s) ` +
        'have had no final delivery status for over 6 hours.',
      severity: 'warn',
      tags: {
        totalStale: payload.totalStale,
        groupCount: payload.groupCount,
        source: 'whatsapp-reconciliation',
      },
    });
  }
}
