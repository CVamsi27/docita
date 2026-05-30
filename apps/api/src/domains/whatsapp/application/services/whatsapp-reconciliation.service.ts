import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { ApplicationEvents } from '@/shared/common/events/application-events';
import {
  IWhatsappReconciliationRepository,
  WHATSAPP_RECONCILIATION_REPOSITORY_TOKEN,
} from '@/domains/whatsapp/core/repositories/whatsapp-reconciliation.repository.interface';

/**
 * Non-destructive WhatsApp delivery reconciliation.
 *
 * Meta's Cloud API delivers status transitions only via webhooks — there is no
 * status-polling endpoint — so an outbound message whose delivery/read webhook
 * never arrives can sit in a non-final status (QUEUED/SENT) indefinitely. This
 * sweep surfaces that backlog for ops/alerting WITHOUT mutating delivery
 * records (marking such messages FAILED is a deliberate follow-up decision).
 */
@Injectable()
export class WhatsappReconciliationService {
  private readonly logger = new Logger(WhatsappReconciliationService.name);

  /** Outbound logs older than this with no final status are considered stale. */
  private static readonly STALE_AFTER_HOURS = 6;

  constructor(
    @Inject(WHATSAPP_RECONCILIATION_REPOSITORY_TOKEN)
    private readonly repository: IWhatsappReconciliationRepository,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async runStaleDeliverySweep(): Promise<void> {
    const cutoff = new Date(
      this.clock.now().getTime() -
        WhatsappReconciliationService.STALE_AFTER_HOURS * 60 * 60 * 1000,
    );

    const groups = await this.repository.findStaleNonFinal(cutoff);
    if (groups.length === 0) {
      return;
    }

    const totalStale = groups.reduce((sum, group) => sum + group.count, 0);
    const breakdown = groups
      .map(
        (group) =>
          `[clinic=${group.clinicId} status=${group.status} count=${group.count}]`,
      )
      .join(' ');

    this.logger.warn(
      `WhatsApp delivery reconciliation: ${totalStale} outbound message(s) across ` +
        `${groups.length} clinic/status group(s) have had no final delivery status ` +
        `for over ${WhatsappReconciliationService.STALE_AFTER_HOURS}h. ${breakdown}`,
    );

    // allow-direct-emit: read-side deliverability telemetry (the alerting hook),
    // not a domain-state command — no outbox needed. Carries counts only (no PHI).
    this.eventEmitter.emit(ApplicationEvents.WHATSAPP_DELIVERY_STALE, {
      totalStale,
      groupCount: groups.length,
    });
  }
}
