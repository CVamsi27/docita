import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ApplicationEvents } from '@/shared/common/events/application-events';
import { OpsAlertService } from '@/shared/modules/monitoring/monitoring/services/ops-alert.service';

type WhatsappDeliveryStalePayload = {
  totalStale: number;
  groupCount: number;
};

type PoolSaturationSustainedPayload = {
  queuedForMs: number;
  waiting: number;
  total: number;
  max: number;
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

  /**
   * Requests are queued for a connection rather than for the database. Paged
   * rather than warned: raising the pool ceiling is a deploy-time change, and
   * the P2 capacity note is explicit that a larger pool is not automatically
   * faster, so this needs a human to look at saturation duration and queue
   * depth before acting.
   */
  @OnEvent(ApplicationEvents.POOL_SATURATION_SUSTAINED, { async: true })
  async handlePoolSaturationSustained(
    payload: PoolSaturationSustainedPayload,
  ): Promise<void> {
    await this.opsAlert.notify({
      title: 'Database connection pool saturated',
      text:
        `Callers have been queued for a connection for ${payload.queuedForMs}ms ` +
        `(waiting=${payload.waiting} total=${payload.total} max=${payload.max}). ` +
        'Requests are waiting for a connection, not for the database.',
      severity: 'page',
      tags: {
        queuedForMs: payload.queuedForMs,
        waiting: payload.waiting,
        total: payload.total,
        max: payload.max,
        source: 'pool-saturation',
      },
    });
  }
}
