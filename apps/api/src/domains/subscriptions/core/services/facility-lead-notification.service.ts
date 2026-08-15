// check-as-cast-density: allow-file — narrowing the persisted JSON payload
// back to the schema-backed notification payload type on read.
import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  facilityLeadNotificationPayloadSchema,
  type FacilityLeadNotificationKind,
  type FacilityLeadNotificationPayload,
} from '@workspace/types';
import {
  PARTNER_PERSISTENCE_PORT,
  type PartnerPersistencePort,
} from '@/domains/subscriptions/application/ports/partner-persistence.port';
import { ApplicationEvents } from '@/shared/common/events/application-events';
import { toPrismaInputJsonValue } from '@/shared/common/json/to-prisma-input-json-value';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';

/** Internal portal route for the lead queue (the notification's deep link). */
const LEADS_QUEUE_DEEP_LINK = '/leads';

/**
 * Materializes the internal (Docita-ops) notification for a facility lead.
 * Listens to the outbox-republished `facility-lead.created` and
 * `facility-lead.converted` events; each notification is keyed by
 * `(leadId, kind)` so a relay redelivery cannot duplicate it. Failures are
 * recorded on the notification row (status FAILED + error) so the delivery
 * state is visible in the internal portal.
 *
 * The listener is best-effort, following the referrer-welcome pattern: the
 * outbox relay marks the event `processedAt` after `emit` (async listeners
 * are fire-and-forget), so a failure here is surfaced on the notification
 * row rather than retried. The durable event itself lives in the outbox
 * table with the relay's existing retry/DLQ bookkeeping.
 *
 * The payload is deliberately PII-redacted: facility name/location, partner
 * name, consent state, and a deep link into the portal — no contact phone
 * or email (matching the plan's "never put unnecessary sensitive data in
 * the messaging path").
 */
@Injectable()
export class FacilityLeadNotificationService {
  private readonly logger = new Logger(FacilityLeadNotificationService.name);

  constructor(
    @Inject(PARTNER_PERSISTENCE_PORT)
    private readonly prisma: PartnerPersistencePort,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  @OnEvent(ApplicationEvents.FACILITY_LEAD_CREATED, { async: true })
  async onLeadCreated(payload: { leadId: string }): Promise<void> {
    await this.materialize(payload.leadId, 'LEAD_CREATED');
  }

  @OnEvent(ApplicationEvents.FACILITY_LEAD_CONVERTED, { async: true })
  async onLeadConverted(payload: { leadId: string }): Promise<void> {
    await this.materialize(payload.leadId, 'LEAD_CONVERTED');
  }

  private async materialize(
    leadId: string,
    kind: FacilityLeadNotificationKind,
  ): Promise<void> {
    try {
      const lead = await this.prisma.facilityLead.findUnique({
        where: { id: leadId },
        include: { referrer: { select: { id: true, name: true } } },
      });
      if (!lead) {
        this.logger.warn(
          `[facility-lead-notification] lead ${leadId} not found; skipping ${kind}`,
        );
        return;
      }

      const payload: FacilityLeadNotificationPayload = {
        leadId: lead.id,
        facilityName: lead.facilityName,
        city: lead.city,
        state: lead.state,
        partnerName: lead.referrer.name,
        consentToFollowUp: lead.consentToFollowUp,
        // Duplicate fingerprinting is a later sub-slice of the P0.
        duplicateScore: null,
        deepLink: LEADS_QUEUE_DEEP_LINK,
      };

      await this.prisma.facilityLeadNotification.upsert({
        where: { leadId_kind: { leadId, kind } },
        create: {
          leadId,
          kind,
          channel: 'internal',
          status: 'DELIVERED',
          // Target the assigned owner (null while the lead sits in the
          // shared triage queue — the assign endpoint re-targets later).
          recipientUserId: lead.ownerUserId ?? null,
          payload: toPrismaInputJsonValue(payload),
          deliveredAt: this.clock.now(),
        },
        update: {
          status: 'DELIVERED',
          recipientUserId: lead.ownerUserId ?? null,
          payload: toPrismaInputJsonValue(payload),
          deliveredAt: this.clock.now(),
          errorMessage: null,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[facility-lead-notification] failed to deliver ${kind} for lead ${leadId}: ${message}`,
      );
      try {
        await this.prisma.facilityLeadNotification.upsert({
          where: { leadId_kind: { leadId, kind } },
          create: {
            leadId,
            kind,
            channel: 'internal',
            status: 'FAILED',
            payload: toPrismaInputJsonValue({
              leadId,
              facilityName: '',
              city: '',
              state: null,
              partnerName: '',
              consentToFollowUp: false,
              duplicateScore: null,
              deepLink: LEADS_QUEUE_DEEP_LINK,
            }),
            errorMessage: message.slice(0, 1000),
          },
          update: {
            status: 'FAILED',
            errorMessage: message.slice(0, 1000),
          },
        });
      } catch (nestedError) {
        this.logger.error(
          `[facility-lead-notification] could not record failure for lead ${leadId}`,
          nestedError instanceof Error
            ? nestedError.stack
            : String(nestedError),
        );
      }
      // Deliberately do not re-throw: the relay's emit is fire-and-forget
      // for async listeners, so a rejection here would be unhandled and the
      // relay would still mark the event processed. The FAILED row above is
      // the operator-visible delivery state.
    }
  }
}

export function parseNotificationPayload(
  payload: unknown,
): FacilityLeadNotificationPayload {
  const parsed = facilityLeadNotificationPayloadSchema.safeParse(payload);
  if (parsed.success) return parsed.data;
  return {
    leadId: '',
    facilityName: '',
    city: '',
    state: null,
    partnerName: '',
    consentToFollowUp: false,
    duplicateScore: null,
    deepLink: LEADS_QUEUE_DEEP_LINK,
  };
}
