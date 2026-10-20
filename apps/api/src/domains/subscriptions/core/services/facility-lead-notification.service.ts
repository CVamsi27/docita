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

/**
 * Per-lead deep link into the internal queue: the notification points at
 * the exact lead (the queue honors `?lead=<id>` by filtering to it).
 */
function leadsQueueDeepLink(leadId: string): string {
  return `/leads?lead=${leadId}`;
}

/**
 * Materializes the internal (Docita-ops) notification for a facility lead.
 * Listens to the outbox-republished `facility-lead.created` and
 * `facility-lead.converted` events; each notification is keyed by
 * `(leadId, kind)` so a relay redelivery cannot duplicate it. Failures are
 * recorded on the notification row (status FAILED + error) so the delivery
 * state is visible in the internal portal.
 *
 * The relay awaits delivery before acknowledging its row. Failed deliveries
 * retain the operator-visible FAILED row and reject so the outbox can retry.
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

  @OnEvent(ApplicationEvents.FACILITY_LEAD_CREATED, {
    async: true,
    promisify: true,
    suppressErrors: false,
  })
  async onLeadCreated(payload: { leadId: string }): Promise<void> {
    await this.materialize(payload.leadId, 'LEAD_CREATED');
  }

  @OnEvent(ApplicationEvents.FACILITY_LEAD_CONVERTED, {
    async: true,
    promisify: true,
    suppressErrors: false,
  })
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
        // Exact fingerprint matches are held for review with score 1.
        duplicateScore: lead.duplicateScore ?? null,
        deepLink: leadsQueueDeepLink(lead.id),
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
              deepLink: leadsQueueDeepLink(leadId),
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
      throw error;
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
    deepLink: leadsQueueDeepLink(''),
  };
}
